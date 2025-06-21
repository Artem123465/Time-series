import React from 'react';

export function ErrorDisplay({ result }) {
  if (!result.error) return null;

  const { message, code, details } = result.error;
  return (
    <div className="error-container">
      <h3>Error in {result.script}</h3>
      <p><strong>Message:</strong> {message}</p>
      <p><strong>Code:</strong> {code}</p>
      {details && Object.keys(details).length > 0 && (
        <div>
          <strong>Details:</strong>
          <ul>
            {Object.entries(details).map(([key, val]) => (
              <li key={key}>{`${key}: ${JSON.stringify(val)}`}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
