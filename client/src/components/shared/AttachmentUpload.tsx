import React, { useState } from 'react';
import { UploadCloud, X, FileText } from 'lucide-react';

export interface AttachmentUploadProps {
  onFileSelect: (file: File | null) => void;
  maxSizeBytes?: number;
  acceptedTypes?: string[];
}

export const AttachmentUpload: React.FC<AttachmentUploadProps> = ({
  onFileSelect,
  maxSizeBytes = 5 * 1024 * 1024, // 5MB
  acceptedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'],
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setError(null);
    if (!file) return;

    if (!acceptedTypes.includes(file.type)) {
      setError('Unsupported file type. Please upload a PNG, JPG, WebP image or PDF.');
      return;
    }

    if (file.size > maxSizeBytes) {
      setError(`File exceeds ${Math.round(maxSizeBytes / (1024 * 1024))}MB size limit.`);
      return;
    }

    setSelectedFile(file);
    onFileSelect(file);

    if (file.type.startsWith('image/')) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    } else {
      setPreviewUrl(null);
    }
  };

  const handleRemove = () => {
    setSelectedFile(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    setError(null);
    onFileSelect(null);
  };

  return (
    <div className="form-group">
      <label className="form-label">Attachment (Optional screenshot or document)</label>
      {!selectedFile ? (
        <label
          className="attachment-dropzone"
          style={{
            border: '2px dashed var(--border-subtle)',
            borderRadius: 'var(--radius-control)',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            cursor: 'pointer',
            backgroundColor: 'var(--surface-muted)',
            transition: 'border-color 0.15s ease',
          }}
        >
          <UploadCloud size={28} color="var(--color-mauve)" />
          <span style={{ fontSize: '13.5px', color: 'var(--color-ink)', fontWeight: 500 }}>
            Click to upload or drag file here
          </span>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            Max 5MB (PNG, JPG, WebP, PDF)
          </span>
          <input
            type="file"
            onChange={handleFileChange}
            accept={acceptedTypes.join(',')}
            style={{ display: 'none' }}
          />
        </label>
      ) : (
        <div
          className="attachment-preview"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '10px 14px',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-control)',
            backgroundColor: 'var(--surface-panel)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {previewUrl ? (
              <img
                src={previewUrl}
                alt="Preview"
                style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 4 }}
              />
            ) : (
              <FileText size={24} color="var(--color-mauve)" />
            )}
            <div>
              <div style={{ fontSize: '13.5px', fontWeight: 500, color: 'var(--color-ink)' }}>
                {selectedFile.name}
              </div>
              <div style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                {(selectedFile.size / 1024).toFixed(1)} KB
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={handleRemove}
            className="btn btn-secondary btn-sm"
            aria-label="Remove attachment"
          >
            <X size={15} />
          </button>
        </div>
      )}
      {error && <span className="form-error">{error}</span>}
    </div>
  );
};
