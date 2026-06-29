import React from 'react';
import { Plus, Trash2 } from 'lucide-react';

const CATEGORIES = ['Audio', 'Lighting', 'Security', 'Fabrication', 'Wiring', 'Other'];

export default function ComponentBuilder({ components = [], onChange }) {
  
  const handleAddRow = () => {
    const newRow = {
      brand: '',
      model: '',
      category: 'Audio',
      quantity: 1,
      notes: ''
    };
    onChange([...components, newRow]);
  };

  const handleRemoveRow = (indexToRemove) => {
    const updated = components.filter((_, idx) => idx !== indexToRemove);
    onChange(updated);
  };

  const handleChangeRow = (index, field, value) => {
    const updated = components.map((comp, idx) => {
      if (idx === index) {
        return { ...comp, [field]: value };
      }
      return comp;
    });
    onChange(updated);
  };

  return (
    <div style={{ marginTop: '20px' }}>
      <div className="component-builder-header">
        <div>Brand *</div>
        <div>Model *</div>
        <div>Category</div>
        <div>Qty</div>
        <div>Notes / Configuration Settings</div>
        <div></div>
      </div>

      {components.map((comp, idx) => (
        <div key={idx} className="component-builder-row">
          <input
            type="text"
            className="form-input"
            placeholder="e.g. Pioneer"
            value={comp.brand}
            onChange={(e) => handleChangeRow(idx, 'brand', e.target.value)}
            required
            style={{ padding: '8px 12px', fontSize: '0.85rem' }}
          />
          <input
            type="text"
            className="form-input"
            placeholder="e.g. DMH-1500NEX"
            value={comp.model}
            onChange={(e) => handleChangeRow(idx, 'model', e.target.value)}
            required
            style={{ padding: '8px 12px', fontSize: '0.85rem' }}
          />
          <select
            className="filter-select"
            value={comp.category}
            onChange={(e) => handleChangeRow(idx, 'category', e.target.value)}
            style={{ padding: '8px 12px', fontSize: '0.85rem', minWidth: 'auto' }}
          >
            {CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
          <input
            type="number"
            className="form-input"
            min="1"
            value={comp.quantity}
            onChange={(e) => handleChangeRow(idx, 'quantity', parseInt(e.target.value) || 1)}
            required
            style={{ padding: '8px 12px', fontSize: '0.85rem' }}
          />
          <input
            type="text"
            className="form-input"
            placeholder="e.g. Custom wiring to accessory fuse"
            value={comp.notes || ''}
            onChange={(e) => handleChangeRow(idx, 'notes', e.target.value)}
            style={{ padding: '8px 12px', fontSize: '0.85rem' }}
          />
          <button
            type="button"
            className="btn btn-danger btn-icon-only"
            onClick={() => handleRemoveRow(idx)}
            title="Remove item"
            style={{ padding: '6px' }}
          >
            <Trash2 size={16} />
          </button>
        </div>
      ))}

      <button
        type="button"
        className="btn btn-secondary"
        onClick={handleAddRow}
        style={{ marginTop: '10px', padding: '10px 18px', fontSize: '0.85rem' }}
      >
        <Plus size={16} />
        <span>Add Component Row</span>
      </button>
    </div>
  );
}
