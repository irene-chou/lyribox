import { ThemeProvider } from 'next-themes'
import { AppLayout } from './components/layout/AppLayout'
import { Toaster } from './components/ui/toaster'
import { DialogHost } from './components/ui/dialog-host'

function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" storageKey="lb-theme">
      <AppLayout />
      <DialogHost />
      <Toaster />
    </ThemeProvider>
  )
}

export default App
