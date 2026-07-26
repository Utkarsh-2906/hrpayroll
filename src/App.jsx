import { Users } from 'lucide-react'
import MusterRoll from './pages/MusterRoll'

function App() {
  return (
    <>
      <header>
        <div className="header-inner container-fluid">
          <div className="header-brand-group">
            <span className="header-logo-mark">
              <Users size={20} aria-hidden="true" />
            </span>
            <div className="header-text-group">
              <span className="header-brand">HR Payroll</span>
              <span className="header-tagline">Muster Roll Generator</span>
            </div>
          </div>
        </div>
      </header>
      <main>
        <MusterRoll />
      </main>
    </>
  )
}

export default App
