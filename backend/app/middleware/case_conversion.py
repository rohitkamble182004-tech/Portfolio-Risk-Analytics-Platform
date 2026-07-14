"""
Centralized camelCase <-> snake_case translation.

Problem this solves: the frontend speaks camelCase and the backend
speaks snake_case (idiomatic for each language), and up to now every
individual API client module (portfolioApi.ts, riskApi.ts,
simulationApi.ts) hand-translated field names before calling
apiClient.post/get. That was inconsistent -- riskApi.ts and
simulationApi.ts did the translation, portfolioApi.ts did not -- which
is exactly how `avgCost`/`assetClass` silently failed to reach the
backend on `POST /portfolios/{id}/holdings`.

This middleware moves the translation to one place: incoming JSON
request bodies are converted camelCase -> snake_case before FastAPI's
Pydantic validation ever sees them, and outgoing JSON response bodies
are converted snake_case -> camelCase before they reach the client.
Route handlers and Pydantic schemas keep using snake_case throughout,
which is idiomatic Python/FastAPI; the frontend keeps using camelCase
throughout, which is idiomatic TypeScript. Neither side has to know
about the other's convention, and no individual API client module has
to remember to translate anything.

Limitations (worth knowing, not blocking):
- Only JSON bodies are touched. Binary responses (e.g. the CSV export
  endpoint) and non-JSON content types pass through untouched.
- Dict *keys* that are meant to be opaque data (not schema field
  names) would also get case-converted if they happened to contain
  underscores/camelCase. Nothing in this codebase currently returns
  such a shape, but if a future endpoint returns e.g. a dict keyed by
  arbitrary tickers or user-supplied strings, exclude that endpoint's
  path in `EXCLUDED_PATH_PREFIXES` below rather than fighting the
  generic converter.
"""
from __future__ import annotations

import json
import re
from typing import Any

from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.requests import Request
from starlette.responses import Response

# Paths where body translation should be skipped entirely (docs, health,
# and anything serving non-JSON/binary payloads).
EXCLUDED_PATH_PREFIXES = (
    "/docs",
    "/redoc",
    "/openapi.json",
    "/health",
)

_CAMEL_TO_SNAKE_RE = re.compile(r"(?<!^)(?=[A-Z])")


def camel_to_snake(key: str) -> str:
    """helloWorld -> hello_world. Leaves already-snake_case keys alone."""
    return _CAMEL_TO_SNAKE_RE.sub("_", key).lower()


def snake_to_camel(key: str) -> str:
    """hello_world -> helloWorld. Leaves already-camelCase keys alone."""
    parts = key.split("_")
    if len(parts) == 1:
        return key
    return parts[0] + "".join(word.capitalize() for word in parts[1:])


def _convert_keys(value: Any, convert: "callable[[str], str]") -> Any:
    if isinstance(value, dict):
        return {convert(k): _convert_keys(v, convert) for k, v in value.items()}
    if isinstance(value, list):
        return [_convert_keys(item, convert) for item in value]
    return value


def convert_request_body_to_snake_case(body: Any) -> Any:
    return _convert_keys(body, camel_to_snake)


def convert_response_body_to_camel_case(body: Any) -> Any:
    return _convert_keys(body, snake_to_camel)


class CaseConversionMiddleware(BaseHTTPMiddleware):
    """Translates JSON request bodies camelCase->snake_case on the way
    in, and JSON response bodies snake_case->camelCase on the way out.
    """

    async def dispatch(
        self, request: Request, call_next: RequestResponseEndpoint
    ) -> Response:
        if any(request.url.path.startswith(p) for p in EXCLUDED_PATH_PREFIXES):
            return await call_next(request)

        request = await self._translate_request(request)
        response = await call_next(request)
        return await self._translate_response(response)

    async def _translate_request(self, request: Request) -> Request:
        content_type = request.headers.get("content-type", "")
        if "application/json" not in content_type:
            return request

        raw = await request.body()
        if not raw:
            return request

        try:
            parsed = json.loads(raw)
        except ValueError:
            # Not valid JSON -- let the route handler produce its own
            # 422 rather than swallowing the error here.
            return request

        converted = convert_request_body_to_snake_case(parsed)
        new_body = json.dumps(converted).encode("utf-8")

        # Starlette's BaseHTTPMiddleware wraps the incoming request in a
        # _CachedRequest whose `wrapped_receive` serves `self._body`
        # directly if it's already been set (which it has, because we
        # just called request.body() above) -- it does NOT re-invoke a
        # replaced `_receive` callable. So the correct way to inject a
        # modified body here is to overwrite the cached `_body`
        # attribute itself, not `_receive`.
        request._body = new_body  # noqa: SLF001 -- Starlette's actual body cache; see requests.py Request.body()
        return request

    async def _translate_response(self, response: Response) -> Response:
        content_type = response.headers.get("content-type", "")
        if "application/json" not in content_type:
            return response

        body_chunks = [chunk async for chunk in response.body_iterator]
        raw = b"".join(body_chunks)
        if not raw:
            return response

        try:
            parsed = json.loads(raw)
        except ValueError:
            # Rebuild the response with the original bytes untouched.
            return Response(
                content=raw,
                status_code=response.status_code,
                headers=dict(response.headers),
                media_type=response.media_type,
            )

        converted = convert_response_body_to_camel_case(parsed)
        new_body = json.dumps(converted).encode("utf-8")

        headers = dict(response.headers)
        headers["content-length"] = str(len(new_body))

        return Response(
            content=new_body,
            status_code=response.status_code,
            headers=headers,
            media_type=response.media_type,
        )
