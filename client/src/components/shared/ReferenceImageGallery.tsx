import React, { useState } from 'react';
import { Attachment } from '../../types/ticket';
import { getAttachmentFullUrl, formatFileSize } from '../../utils/format';
import { Image as ImageIcon, FileText, Download, ExternalLink, X, UploadCloud, Eye } from 'lucide-react';

interface ReferenceImageGalleryProps {
  attachments?: Attachment[];
  title?: string;
  subtitle?: string;
  canUpload?: boolean;
  onUpload?: (file: File) => Promise<void>;
  isUploading?: boolean;
  emptyMessage?: string;
}

export const ReferenceImageGallery: React.FC<ReferenceImageGalleryProps> = ({
  attachments = [],
  title = 'Reference Images & Visual Evidence',
  subtitle = 'Visual attachments for technician diagnosis and repair',
  canUpload = false,
  onUpload,
  isUploading = false,
  emptyMessage = 'No reference images or attachments provided.',
}) => {
  const [selectedImage, setSelectedImage] = useState<Attachment | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const images = attachments.filter(
    (a) => a.mime_type?.startsWith('image/') || /\.(png|jpe?g|webp|gif|svg)$/i.test(a.name)
  );
  const otherFiles = attachments.filter(
    (a) => !a.mime_type?.startsWith('image/') && !/\.(png|jpe?g|webp|gif|svg)$/i.test(a.name)
  );

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !onUpload) return;
    setUploadError(null);

    if (file.size > 5 * 1024 * 1024) {
      setUploadError('File exceeds 5MB size limit.');
      return;
    }

    try {
      await onUpload(file);
      e.target.value = '';
    } catch {
      setUploadError('Failed to upload attachment. Please try again.');
    }
  };

  return (
    <div className="panel" style={{ borderLeft: '4px solid var(--color-plum)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', marginBottom: '14px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ImageIcon size={19} color="var(--color-plum)" />
            <h2 style={{ fontSize: '16px', margin: 0 }}>{title}</h2>
            {images.length > 0 && (
              <span
                style={{
                  background: 'var(--color-plum)',
                  color: '#fff',
                  fontSize: '11px',
                  fontWeight: 700,
                  padding: '2px 8px',
                  borderRadius: '12px',
                }}
              >
                {images.length} {images.length === 1 ? 'Photo' : 'Photos'}
              </span>
            )}
          </div>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px', margin: 0 }}>
            {subtitle}
          </p>
        </div>

        {canUpload && onUpload && (
          <div>
            <label
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                fontSize: '13px',
                fontWeight: 600,
                color: 'var(--color-plum)',
                background: 'var(--surface-page-subtle)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-control)',
                cursor: isUploading ? 'not-allowed' : 'pointer',
                transition: 'background-color 0.15s',
              }}
            >
              <UploadCloud size={15} />
              <span>{isUploading ? 'Uploading...' : 'Add Reference Image'}</span>
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif,application/pdf"
                onChange={handleFileChange}
                disabled={isUploading}
                style={{ display: 'none' }}
              />
            </label>
          </div>
        )}
      </div>

      {uploadError && (
        <div
          style={{
            background: 'var(--status-critical-bg)',
            color: 'var(--status-critical-text)',
            padding: '8px 12px',
            borderRadius: 'var(--radius-control)',
            marginBottom: '14px',
            fontSize: '13px',
          }}
        >
          {uploadError}
        </div>
      )}

      {/* Images Grid */}
      {images.length > 0 ? (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
            gap: '14px',
            marginBottom: otherFiles.length > 0 ? '16px' : '0',
          }}
        >
          {images.map((img, idx) => {
            const fullUrl = getAttachmentFullUrl(img.url);
            return (
              <div
                key={img.id || idx}
                style={{
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-control)',
                  overflow: 'hidden',
                  background: 'var(--surface-muted)',
                  display: 'flex',
                  flexDirection: 'column',
                  transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                }}
              >
                {/* Thumbnail */}
                <div
                  style={{
                    position: 'relative',
                    height: '130px',
                    backgroundColor: '#1a191f',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden',
                  }}
                  onClick={() => setSelectedImage(img)}
                  title="Click to view full image"
                >
                  <img
                    src={fullUrl}
                    alt={img.name}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      display: 'block',
                    }}
                    onError={(e) => {
                      // Fallback if image fails to render as thumbnail
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      background: 'rgba(0,0,0,0.25)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      opacity: 0,
                      transition: 'opacity 0.15s',
                    }}
                    className="img-hover-overlay"
                    onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
                    onMouseLeave={(e) => (e.currentTarget.style.opacity = '0')}
                  >
                    <div
                      style={{
                        background: 'rgba(0,0,0,0.7)',
                        color: '#fff',
                        padding: '6px 10px',
                        borderRadius: '6px',
                        fontSize: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      <Eye size={14} /> View
                    </div>
                  </div>
                </div>

                {/* Info Bar */}
                <div style={{ padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div
                    style={{
                      fontSize: '12px',
                      fontWeight: 600,
                      color: 'var(--color-ink)',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                    title={img.name}
                  >
                    {img.name}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', color: 'var(--text-muted)' }}>
                    <span>{formatFileSize(img.sizeBytes) || 'Image'}</span>
                    <a
                      href={fullUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '2px',
                        color: 'var(--color-plum)',
                        textDecoration: 'none',
                        fontWeight: 600,
                      }}
                      title="Open full resolution in new tab"
                    >
                      <ExternalLink size={12} />
                      Open
                    </a>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        attachments.length === 0 && (
          <div
            style={{
              padding: '16px',
              textAlign: 'center',
              background: 'var(--surface-muted)',
              borderRadius: 'var(--radius-control)',
              color: 'var(--text-muted)',
              fontSize: '13px',
            }}
          >
            {emptyMessage}
          </div>
        )
      )}

      {/* Non-image files */}
      {otherFiles.length > 0 && (
        <div style={{ marginTop: images.length > 0 ? '14px' : '0', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            Attached Documents
          </div>
          {otherFiles.map((doc, idx) => {
            const docUrl = getAttachmentFullUrl(doc.url);
            return (
              <div
                key={doc.id || idx}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 12px',
                  background: 'var(--surface-muted)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-control)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                  <FileText size={18} color="var(--color-mauve)" />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {doc.name}
                    </div>
                    {doc.sizeBytes && (
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        {formatFileSize(doc.sizeBytes)}
                      </div>
                    )}
                  </div>
                </div>
                <a
                  href={docUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  download={doc.name}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '4px 8px',
                    fontSize: '12px',
                    fontWeight: 600,
                    color: 'var(--color-plum)',
                    background: 'var(--surface-panel)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '4px',
                    textDecoration: 'none',
                  }}
                >
                  <Download size={13} />
                  <span>Download</span>
                </a>
              </div>
            );
          })}
        </div>
      )}

      {/* Lightbox Modal for Full-Resolution Viewing */}
      {selectedImage && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.85)',
            zIndex: 9999,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
          }}
          onClick={() => setSelectedImage(null)}
        >
          <div
            style={{
              position: 'relative',
              maxWidth: '90vw',
              maxHeight: '85vh',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              background: '#121118',
              borderRadius: '8px',
              padding: '12px',
              boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header bar */}
            <div
              style={{
                width: '100%',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                paddingBottom: '8px',
                marginBottom: '8px',
                borderBottom: '1px solid rgba(255,255,255,0.1)',
                color: '#fff',
              }}
            >
              <div style={{ fontSize: '14px', fontWeight: 600 }}>
                {selectedImage.name} {selectedImage.sizeBytes && `(${formatFileSize(selectedImage.sizeBytes)})`}
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <a
                  href={getAttachmentFullUrl(selectedImage.url)}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    color: '#ccc',
                    fontSize: '13px',
                    textDecoration: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '4px 8px',
                    borderRadius: '4px',
                    background: 'rgba(255,255,255,0.1)',
                  }}
                >
                  <ExternalLink size={14} /> Full View
                </a>
                <button
                  onClick={() => setSelectedImage(null)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#fff',
                    cursor: 'pointer',
                    padding: '4px',
                  }}
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Main Image */}
            <div style={{ maxWidth: '85vw', maxHeight: '75vh', overflow: 'auto', display: 'flex', justifyContent: 'center' }}>
              <img
                src={getAttachmentFullUrl(selectedImage.url)}
                alt={selectedImage.name}
                style={{
                  maxWidth: '100%',
                  maxHeight: '75vh',
                  objectFit: 'contain',
                  borderRadius: '4px',
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
