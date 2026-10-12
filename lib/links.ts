// Enlaces entre módulos. Las pantallas de listado aplican ?q= (filtra la tabla)
// y ?id= (abre la ficha, si la pantalla tiene) al cargar: ver ResourceManager.

function filtered(path: string, q: string) {
  return `${path}?${new URLSearchParams({ q })}`;
}

export const links = {
  // Ficha del socio (si el id no aparece en la lista, queda filtrada por nombre).
  member: (id: string, name: string) => `/members?${new URLSearchParams({ id, q: name })}`,
  // Listados de otro módulo filtrados por el nombre del socio.
  memberMemberships: (memberName: string) => filtered('/memberships', memberName),
  memberPayments: (memberName: string) => filtered('/payment-records', memberName),
  memberRoutines: (memberName: string) => filtered('/routines', memberName),
  plan: (name: string) => filtered('/membership-plans', name),
  product: (name: string) => filtered('/products', name),
  trainer: (name: string) => filtered('/trainers', name),
  concept: (name: string) => filtered('/concepts', name),
};

type Person = { id?: string; user?: { profile?: { firstName?: string | null; lastName?: string | null } | null } | null };

export function personName(person: Person | null | undefined) {
  const profile = person?.user?.profile;
  return `${profile?.firstName ?? ''} ${profile?.lastName ?? ''}`.trim();
}
