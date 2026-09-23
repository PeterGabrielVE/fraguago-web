import { redirect } from 'next/navigation';

// La medicación de uso continuo se gestiona desde la Ficha Médica de cada socio.
export default function Page() {
  redirect('/health');
}
