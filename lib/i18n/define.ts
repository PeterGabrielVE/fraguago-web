// Un módulo de traducciones lleva el español y el inglés lado a lado.
// El español define la forma; NoInfer obliga a que el inglés tenga exactamente las mismas claves.
export function defineMessages<T>(messages: { es: T; en: NoInfer<T> }): { es: T; en: T } {
  return messages;
}
