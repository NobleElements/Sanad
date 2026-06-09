import { BrowserRouter, Routes, Route } from 'react-router-dom';

function App() {
  return (
    <BrowserRouter>
      <div className="flex h-screen w-full bg-slate-50">
        <Routes>
          <Route path="/" element={<div>Dashboard Placeholder</div>} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;
