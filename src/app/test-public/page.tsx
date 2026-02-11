export default function TestPublicPage() {
  return (
    <div style={{ padding: '2rem' }}>
      <h1>Test Public Page</h1>
      <p>If you can see this, the redirect loop is NOT caused by Azure SWA platform config.</p>
      <p>Current time: {new Date().toISOString()}</p>
    </div>
  );
}
