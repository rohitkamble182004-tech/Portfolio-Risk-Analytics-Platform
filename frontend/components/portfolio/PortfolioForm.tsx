import React, { useState } from "react";
import type { CreatePortfolioRequest, AddHoldingRequest } from "../../types/portfolio";

// ─── Create Portfolio Form ────────────────────────────────────────────────────

interface CreatePortfolioFormProps {
  onSubmit: (payload: CreatePortfolioRequest) => Promise<void>;
  onCancel?: () => void;
  isSubmitting?: boolean;
}

export const CreatePortfolioForm: React.FC<CreatePortfolioFormProps> = ({
  onSubmit,
  onCancel,
  isSubmitting,
}) => {
  const [values, setValues] = useState<CreatePortfolioRequest>({
    name: "",
    description: "",
    currency: "USD",
    benchmark: "SPY",
  });
  const [errors, setErrors] = useState<Partial<Record<keyof CreatePortfolioRequest, string>>>({});

  const validate = () => {
    const e: typeof errors = {};
    if (!values.name.trim()) e.name = "Portfolio name is required";
    return e;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    await onSubmit(values);
  };

  const set = (field: keyof CreatePortfolioRequest) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setValues((v) => ({ ...v, [field]: e.target.value }));

  return (
    <div className="pf-form">
      <h3 className="pf-form__title">New Portfolio</h3>
      <div className="pf-form__fields">
        <div className="form-group">
          <label className="form-label">Portfolio Name *</label>
          <input
            className="form-input"
            placeholder="e.g. Growth Portfolio"
            value={values.name}
            onChange={set("name")}
            disabled={isSubmitting}
          />
          {errors.name && <span className="form-error">{errors.name}</span>}
        </div>

        <div className="form-group">
          <label className="form-label">Description</label>
          <textarea
            className="form-input"
            rows={2}
            placeholder="Optional description…"
            value={values.description}
            onChange={set("description")}
            disabled={isSubmitting}
            style={{ resize: "vertical" }}
          />
        </div>

        <div className="pf-form__row">
          <div className="form-group">
            <label className="form-label">Currency</label>
            <select className="form-select" value={values.currency} onChange={set("currency")} disabled={isSubmitting}>
              {["USD", "EUR", "GBP", "JPY", "CAD", "AUD", "CHF", "INR"].map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Benchmark Ticker</label>
            <input
              className="form-input"
              placeholder="e.g. SPY"
              value={values.benchmark}
              onChange={set("benchmark")}
              disabled={isSubmitting}
              style={{ textTransform: "uppercase" }}
            />
          </div>
        </div>

        <div className="pf-form__actions">
          {onCancel && (
            <button type="button" className="btn btn-ghost" onClick={onCancel} disabled={isSubmitting}>
              Cancel
            </button>
          )}
          <button className="btn btn-primary" onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? <span className="spinner" style={{ width: 14, height: 14 }} /> : null}
            Create Portfolio
          </button>
        </div>
      </div>

      <style>{`
        .pf-form { display: flex; flex-direction: column; gap: 1.25rem; }
        .pf-form__title {
          font-family: var(--font-display);
          font-size: 1.1rem;
          font-weight: 700;
        }
        .pf-form__fields { display: flex; flex-direction: column; gap: 1rem; }
        .pf-form__row { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
        .pf-form__actions {
          display: flex; gap: 0.75rem;
          justify-content: flex-end;
          padding-top: 0.5rem;
        }
      `}</style>
    </div>
  );
};

// ─── Add Holding Form ─────────────────────────────────────────────────────────

interface AddHoldingFormProps {
  onSubmit: (payload: AddHoldingRequest) => Promise<void>;
  onCancel?: () => void;
  isSubmitting?: boolean;
}

export const AddHoldingForm: React.FC<AddHoldingFormProps> = ({
  onSubmit,
  onCancel,
  isSubmitting,
}) => {
  const [values, setValues] = useState<AddHoldingRequest>({
    ticker: "",
    quantity: 0,
    avgCost: 0,
    assetClass: "equity",
  });
  const [errors, setErrors] = useState<Partial<Record<keyof AddHoldingRequest, string>>>({});

  const validate = () => {
    const e: typeof errors = {};
    if (!values.ticker.trim()) e.ticker = "Ticker is required";
    if (values.quantity <= 0) e.quantity = "Quantity must be > 0";
    if (values.avgCost <= 0) e.avgCost = "Average cost must be > 0";
    return e;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    await onSubmit({ ...values, ticker: values.ticker.toUpperCase() });
  };

  const setField =
    (field: keyof AddHoldingRequest) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      const val = e.target.type === "number" ? parseFloat(e.target.value) || 0 : e.target.value;
      setValues((v) => ({ ...v, [field]: val }));
    };

  return (
    <div className="ahf">
      <h3 className="ahf__title">Add Holding</h3>

      <div className="ahf__fields">
        <div className="ahf__row">
          <div className="form-group">
            <label className="form-label">Ticker *</label>
            <input
              className="form-input"
              placeholder="e.g. AAPL"
              value={values.ticker}
              onChange={setField("ticker")}
              disabled={isSubmitting}
              style={{ textTransform: "uppercase" }}
            />
            {errors.ticker && <span className="form-error">{errors.ticker}</span>}
          </div>
          <div className="form-group">
            <label className="form-label">Asset Class</label>
            <select className="form-select" value={values.assetClass} onChange={setField("assetClass")} disabled={isSubmitting}>
              {["equity", "bond", "commodity", "cash", "crypto", "alternative"].map((ac) => (
                <option key={ac} value={ac}>{ac.charAt(0).toUpperCase() + ac.slice(1)}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="ahf__row">
          <div className="form-group">
            <label className="form-label">Quantity *</label>
            <input
              type="number"
              className="form-input"
              placeholder="100"
              min="0"
              step="any"
              value={values.quantity || ""}
              onChange={setField("quantity")}
              disabled={isSubmitting}
            />
            {errors.quantity && <span className="form-error">{errors.quantity}</span>}
          </div>
          <div className="form-group">
            <label className="form-label">Avg Cost (USD) *</label>
            <input
              type="number"
              className="form-input"
              placeholder="150.00"
              min="0"
              step="0.01"
              value={values.avgCost || ""}
              onChange={setField("avgCost")}
              disabled={isSubmitting}
            />
            {errors.avgCost && <span className="form-error">{errors.avgCost}</span>}
          </div>
        </div>

        <div className="ahf__actions">
          {onCancel && (
            <button type="button" className="btn btn-ghost" onClick={onCancel} disabled={isSubmitting}>
              Cancel
            </button>
          )}
          <button className="btn btn-primary" onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting && <span className="spinner" style={{ width: 14, height: 14 }} />}
            Add Holding
          </button>
        </div>
      </div>

      <style>{`
        .ahf { display: flex; flex-direction: column; gap: 1.25rem; }
        .ahf__title { font-family: var(--font-display); font-size: 1.1rem; font-weight: 700; }
        .ahf__fields { display: flex; flex-direction: column; gap: 1rem; }
        .ahf__row { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
        .ahf__actions { display: flex; gap: 0.75rem; justify-content: flex-end; padding-top: 0.5rem; }
      `}</style>
    </div>
  );
};