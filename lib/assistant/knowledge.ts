// Base de conocimiento del asistente de ayuda (sin IA).
//
// - keywords: palabras o frases con las que la gente pregunta. No hace falta
//   poner plurales, acentos ni conjugaciones (el motor las une), pero sí
//   sinónimos distintos. Las frases de varias palabras pesan más.
// - roles: quién puede HACER lo que explica la entrada (OWNER pasa siempre,
//   salvo entradas solo del socio). Sin roles = todos.
// - Las respuestas usan markdown mínimo: **negrita**, listas y [texto](/ruta).
//
// Permisos tomados de los @Roles de cada controlador del API. Al agregar o
// cambiar una pantalla o un permiso, actualizar aquí.
import { es } from '@/lib/i18n/messages/es';
import { en } from '@/lib/i18n/messages/en';
import type { NavItemKey } from '@/lib/navigation';

export type Role = 'OWNER' | 'ADMIN' | 'STAFF' | 'TRAINER' | 'MEMBER';
type L = { es: string; en: string };

export type Entry = {
  id: string;
  title: L;
  keywords: { es: string[]; en: string[] };
  answer: L;
  roles?: Role[];
  related?: string[];
  /** Ruta de la pantalla que describe (para "¿qué hago aquí?"). */
  page?: string;
};

const ADMINS: Role[] = ['OWNER', 'ADMIN'];
const DESK: Role[] = ['OWNER', 'ADMIN', 'STAFF'];
const TEAM: Role[] = ['OWNER', 'ADMIN', 'STAFF', 'TRAINER'];
const COACH: Role[] = ['OWNER', 'ADMIN', 'TRAINER'];
const MEMBER: Role[] = ['MEMBER'];

export const ROLE_NAMES: Record<Role, L> = {
  OWNER: { es: 'Propietario', en: 'Owner' },
  ADMIN: { es: 'Administrador', en: 'Administrator' },
  STAFF: { es: 'Personal', en: 'Staff' },
  TRAINER: { es: 'Entrenador', en: 'Trainer' },
  MEMBER: { es: 'Socio', en: 'Member' },
};

// ---------------------------------------------------------------------------
// Tareas (cómo hacer algo)
// ---------------------------------------------------------------------------
const TASKS: Entry[] = [
  // --- Socios ---
  {
    id: 'member-create',
    title: { es: '¿Cómo registro un socio nuevo?', en: 'How do I register a new member?' },
    keywords: {
      es: ['registrar socio', 'crear socio', 'agregar socio', 'inscribir', 'alta socio', 'nuevo socio', 'afiliar'],
      en: ['add member', 'create member', 'register member', 'sign up member', 'enroll'],
    },
    roles: DESK,
    related: ['signup-link', 'membership-assign'],
    answer: {
      es: `1. Ve a [Socios](/members) y pulsa **Nuevo**.
2. Completa nombre, apellido, **cédula**, correo y teléfono.
3. Define la **contraseña** con la que el socio entrará a su portal (mínimo 8 caracteres).
4. Guarda. Luego asígnale un plan en [Membresías](/memberships).

También puedes usar la acción rápida **Registrar socio** del buscador superior.`,
      en: `1. Go to [Members](/members) and click **New**.
2. Fill in first and last name, **ID number**, email and phone.
3. Set the **password** the member will use for their portal (at least 8 characters).
4. Save. Then assign a plan in [Memberships](/memberships).

You can also use the **Register member** quick action in the top search bar.`,
    },
  },
  {
    id: 'signup-link',
    title: { es: '¿Cómo se inscriben los socios por su cuenta?', en: 'How can members sign up on their own?' },
    keywords: {
      es: ['enlace inscripcion', 'link registro', 'inscripcion publica', 'formulario publico', 'registrarse solos', 'auto registro', 'compartir enlace'],
      en: ['signup link', 'registration link', 'public form', 'self signup', 'share link'],
    },
    roles: DESK,
    related: ['member-create', 'settings'],
    answer: {
      es: `El gimnasio tiene un formulario público de inscripción.
1. En [Socios](/members) pulsa **Enlace de inscripción** para copiarlo.
2. Compártelo por WhatsApp, redes o un código QR.
3. Quien lo complete queda registrado como socio.

El nombre corto del enlace (/registro/…) se cambia en [Configuración](/settings).`,
      en: `The gym has a public signup form.
1. In [Members](/members) click **Signup link** to copy it.
2. Share it via WhatsApp, social media or a QR code.
3. Whoever fills it in is registered as a member.

The short name of the link (/registro/…) is changed in [Settings](/settings).`,
    },
  },
  {
    id: 'member-edit',
    title: { es: '¿Cómo edito o elimino un socio?', en: 'How do I edit or delete a member?' },
    keywords: {
      es: ['editar socio', 'modificar socio', 'eliminar socio', 'actualizar datos socio', 'corregir socio', 'cambiar contrasena socio'],
      en: ['edit member', 'update member', 'delete member', 'change member password'],
    },
    roles: DESK,
    related: ['member-create'],
    answer: {
      es: `En [Socios](/members) busca al socio:
- **Editar**: pulsa el lápiz de su fila. Ahí también puedes cambiarle la contraseña del portal.
- **Eliminar**: menú **⋮** → Eliminar. Si solo quieres que deje de entrar, es mejor **suspender o cancelar su membresía** para conservar el historial.`,
      en: `In [Members](/members) find the member:
- **Edit**: click the pencil on their row. You can also change their portal password there.
- **Delete**: **⋮** menu → Delete. If you only want to stop them from checking in, it's better to **suspend or cancel their membership** to keep the history.`,
    },
  },

  // --- Asistencia ---
  {
    id: 'checkin',
    title: { es: '¿Cómo registro la entrada de un socio?', en: 'How do I check a member in?' },
    keywords: {
      es: ['registrar entrada', 'checkin', 'marcar asistencia', 'registrar asistencia', 'llego socio', 'salida socio', 'aforo'],
      en: ['check in', 'checkin', 'attendance', 'check out', 'occupancy'],
    },
    roles: TEAM,
    related: ['checkin-public', 'membership-suspend'],
    answer: {
      es: `1. Ve a [Asistencia](/attendance) (o usa la acción rápida **Registrar entrada** del buscador).
2. Busca al socio por nombre o cédula y confirma la entrada.
3. Para la salida, usa la acción de salida en su registro del día.

Si su membresía está **vencida, suspendida o cancelada**, el sistema no deja registrar la entrada.`,
      en: `1. Go to [Attendance](/attendance) (or use the **Check in** quick action in the search bar).
2. Find the member by name or ID number and confirm.
3. For check-out, use the check-out action on today's record.

If their membership is **expired, suspended or cancelled**, the system won't allow the check-in.`,
    },
  },
  {
    id: 'checkin-public',
    title: { es: '¿Los socios pueden marcar su entrada solos?', en: 'Can members check themselves in?' },
    keywords: {
      es: ['checkin publico', 'enlace asistencia', 'tablet recepcion', 'marcar solos', 'autoservicio', 'kiosco'],
      en: ['public check in', 'self check in', 'kiosk', 'front desk tablet'],
    },
    roles: TEAM,
    related: ['checkin'],
    answer: {
      es: `Sí. En [Asistencia](/attendance) está el enlace público de check-in (/check-in/…). Ábrelo en una tablet o computadora de recepción y los socios marcan su entrada ahí. Los socios también pueden marcarla desde su portal.`,
      en: `Yes. In [Attendance](/attendance) there's the public check-in link (/check-in/…). Open it on a front-desk tablet or computer and members check in there. Members can also check in from their portal.`,
    },
  },

  // --- Membresías ---
  {
    id: 'membership-assign',
    title: { es: '¿Cómo le asigno una membresía a un socio?', en: 'How do I assign a membership?' },
    keywords: {
      es: ['asignar membresia', 'vender plan', 'dar membresia', 'inscribir plan', 'activar membresia', 'nueva membresia', 'cobrar membresia'],
      en: ['assign membership', 'sell plan', 'new membership', 'activate membership'],
    },
    roles: DESK,
    related: ['payment-register', 'plan-create', 'membership-renew'],
    answer: {
      es: `1. Ve a [Membresías](/memberships) y pulsa **Nuevo**.
2. Elige el **socio**, el **plan** y la fecha de inicio.
3. Registra el **pago** (método, referencia, monto). Puedes subir la foto del comprobante para autocompletar.
4. Guarda: la membresía queda activa y el ingreso se registra en Finanzas.`,
      en: `1. Go to [Memberships](/memberships) and click **New**.
2. Choose the **member**, the **plan** and the start date.
3. Record the **payment** (method, reference, amount). You can upload a photo of the receipt to autofill.
4. Save: the membership becomes active and the income is recorded in Finances.`,
    },
  },
  {
    id: 'membership-renew',
    title: { es: '¿Cómo renuevo una membresía?', en: 'How do I renew a membership?' },
    keywords: {
      es: ['renovar', 'renovar membresia', 'extender membresia', 'pagar mes', 'membresia vencida', 'vencio membresia', 'vencida', 'vencio'],
      en: ['renew', 'renew membership', 'extend membership', 'expired'],
    },
    roles: DESK,
    related: ['membership-assign', 'membership-suspend-vs-cancel'],
    answer: {
      es: `1. En [Membresías](/memberships) abre el menú **⋮** de la membresía.
2. Elige **Renovar**, selecciona el plan (puede ser otro) y registra el pago.

- Si **aún no venció**, el nuevo período se suma desde la fecha de vencimiento: no pierde días.
- Si **ya venció**, el nuevo período empieza hoy.`,
      en: `1. In [Memberships](/memberships) open the membership's **⋮** menu.
2. Choose **Renew**, pick the plan (can be a different one) and record the payment.

- If it **hasn't expired yet**, the new period is added from the expiry date: no days are lost.
- If it **already expired**, the new period starts today.`,
    },
  },
  {
    id: 'membership-suspend',
    title: { es: '¿Qué hace suspender una membresía?', en: 'What does suspending a membership do?' },
    keywords: {
      es: ['suspender', 'suspender membresia', 'pausar membresia', 'congelar', 'reactivar', 'reactivar membresia', 'viaje', 'vacaciones', 'lesion', 'lesionado', 'enfermo', 'no vendra', 'ausencia temporal'],
      en: ['suspend', 'suspend membership', 'pause membership', 'reactivate'],
    },
    roles: DESK,
    related: ['membership-suspend-vs-cancel', 'membership-cancel'],
    answer: {
      es: `**Suspender** es una pausa temporal: mientras esté suspendida, el socio **no puede registrar asistencia**.
- Se hace en [Membresías](/memberships) → menú **⋮** → **Suspender**.
- Para volver a habilitarla: menú **⋮** → **Reactivar**.

Importante: la fecha de vencimiento **no se extiende**; los días siguen contando mientras está suspendida.`,
      en: `**Suspending** is a temporary pause: while suspended, the member **can't check in**.
- Do it in [Memberships](/memberships) → **⋮** menu → **Suspend**.
- To enable it again: **⋮** menu → **Reactivate**.

Important: the expiry date is **not extended**; days keep counting while it's suspended.`,
    },
  },
  {
    id: 'membership-cancel',
    title: { es: '¿Qué pasa si cancelo una membresía?', en: 'What happens if I cancel a membership?' },
    keywords: {
      es: ['cancelar membresia', 'anular membresia', 'dar de baja', 'eliminar membresia', 'borrar membresia', 'cancelacion'],
      en: ['cancel membership', 'delete membership', 'terminate membership'],
    },
    roles: DESK,
    related: ['membership-suspend-vs-cancel', 'membership-assign'],
    answer: {
      es: `**Cancelar** termina la membresía de forma **definitiva** y no se puede deshacer.
- Se hace en [Membresías](/memberships) → menú **⋮** → **Cancelar membresía**.
- Queda en el historial con sus pagos.
- Para volver a habilitar al socio hay que **asignarle una membresía nueva**.

Las membresías no se eliminan, para no perder el historial de pagos.`,
      en: `**Cancelling** ends the membership **permanently** and can't be undone.
- Do it in [Memberships](/memberships) → **⋮** menu → **Cancel membership**.
- It stays in the history with its payments.
- To enable the member again you need to **assign a new membership**.

Memberships aren't deleted, so the payment history is kept.`,
    },
  },
  {
    id: 'membership-suspend-vs-cancel',
    title: { es: '¿Diferencia entre suspender y cancelar?', en: 'Suspend vs. cancel?' },
    keywords: {
      es: ['diferencia suspender cancelar', 'suspender o cancelar', 'suspender cancelar', 'diferencia'],
      en: ['difference suspend cancel', 'suspend or cancel', 'suspend cancel'],
    },
    roles: DESK,
    related: ['membership-suspend', 'membership-cancel'],
    answer: {
      es: `- **Suspender**: pausa **temporal**. No puede registrar asistencia, pero se puede **reactivar** cuando quieras. Los días siguen contando.
- **Cancelar**: fin **definitivo**. No se puede reactivar; para volver hay que asignarle una membresía nueva.

Ambas opciones están en [Membresías](/memberships) → menú **⋮**.`,
      en: `- **Suspend**: **temporary** pause. They can't check in, but you can **reactivate** it at any time. Days keep counting.
- **Cancel**: **permanent** end. It can't be reactivated; they need a new membership to come back.

Both are in [Memberships](/memberships) → **⋮** menu.`,
    },
  },
  {
    id: 'plan-create',
    title: { es: '¿Cómo creo o cambio un plan?', en: 'How do I create or change a plan?' },
    keywords: {
      es: ['crear plan', 'nuevo plan', 'precio plan', 'cambiar precio', 'tarifa', 'mensual', 'anual', 'duracion plan'],
      en: ['create plan', 'plan price', 'change price', 'pricing', 'monthly', 'yearly'],
    },
    roles: ADMINS,
    related: ['membership-assign'],
    answer: {
      es: `En [Planes](/membership-plans) pulsa **Nuevo** e indica nombre, **precio** y **duración en días** (p. ej. 30 para mensual). Para cambiar el precio, edita el plan con el lápiz: aplica a las ventas y renovaciones futuras.`,
      en: `In [Plans](/membership-plans) click **New** and set the name, **price** and **duration in days** (e.g. 30 for monthly). To change the price, edit the plan with the pencil: it applies to future sales and renewals.`,
    },
  },

  // --- Pagos y finanzas ---
  {
    id: 'payment-register',
    title: { es: '¿Cómo registro un pago?', en: 'How do I record a payment?' },
    keywords: {
      es: ['registrar pago', 'pago movil', 'transferencia', 'zelle', 'efectivo', 'referencia', 'metodo pago', 'comprobante', 'capture', 'captura'],
      en: ['record payment', 'payment method', 'bank transfer', 'cash', 'receipt', 'reference'],
    },
    roles: DESK,
    related: ['payment-ocr', 'exchange-rate', 'membership-assign'],
    answer: {
      es: `Los pagos se registran al **asignar o renovar una membresía** y al **vender** en [Ventas](/sales).
- Métodos: Efectivo, Pago Móvil, Transferencia, Zelle, Tarjeta y Otro.
- **Pago Móvil y Transferencia** exigen la referencia.
- Puedes subir la foto del comprobante para autocompletar los datos.

El historial está en [Pagos](/payment-records).`,
      en: `Payments are recorded when **assigning or renewing a membership** and when **selling** in [Sales](/sales).
- Methods: Cash, Pago Móvil, Bank transfer, Zelle, Card and Other.
- **Pago Móvil and Bank transfer** require the reference.
- You can upload a photo of the receipt to autofill the data.

The history is in [Payments](/payment-records).`,
    },
  },
  {
    id: 'payment-ocr',
    title: { es: '¿Cómo funciona leer el comprobante?', en: 'How does reading the receipt work?' },
    keywords: {
      es: ['foto comprobante', 'leer comprobante', 'ocr', 'escanear', 'autocompletar pago', 'subir comprobante'],
      en: ['receipt photo', 'scan receipt', 'ocr', 'autofill payment', 'upload receipt'],
    },
    roles: DESK,
    related: ['payment-register'],
    answer: {
      es: `Al registrar un pago, sube la **foto o captura del comprobante**. El sistema la lee y autocompleta método, referencia, banco y monto.

**Revisa siempre los datos antes de guardar**: la lectura puede equivocarse si la imagen está borrosa o recortada.`,
      en: `When recording a payment, upload the **photo or screenshot of the receipt**. The system reads it and autofills method, reference, bank and amount.

**Always check the data before saving**: the reading can be wrong if the image is blurry or cropped.`,
    },
  },
  {
    id: 'exchange-rate',
    title: { es: '¿Cómo actualizo la tasa del dólar?', en: 'How do I update the exchange rate?' },
    keywords: {
      es: ['tasa', 'tasa bcv', 'actualizar tasa', 'precio dolar', 'bolivares', 'euro', 'conversion'],
      en: ['exchange rate', 'dollar rate', 'bcv rate', 'currency'],
    },
    roles: DESK,
    related: ['payment-register'],
    answer: {
      es: `En [Tasas de cambio](/exchange-rates) puedes **sincronizar con el BCV** o cargar la tasa manualmente. El sistema la usa para convertir montos entre bolívares y divisas. Solo Propietario y Administrador pueden borrar tasas.`,
      en: `In [Exchange rates](/exchange-rates) you can **sync with the BCV** or enter the rate manually. The system uses it to convert amounts between bolívares and foreign currency. Only Owner and Administrator can delete rates.`,
    },
  },
  {
    id: 'finances',
    title: { es: '¿Cómo registro un gasto o ingreso?', en: 'How do I record an expense or income?' },
    keywords: {
      es: ['registrar gasto', 'egreso', 'ingreso', 'gasto', 'balance', 'caja', 'contabilidad', 'cuanto gane', 'ganancias'],
      en: ['expense', 'income', 'balance', 'cash flow', 'accounting', 'profit'],
    },
    roles: DESK,
    related: ['concepts', 'reports'],
    answer: {
      es: `En [Finanzas](/finances) pulsa **Nuevo**, elige si es ingreso o egreso, el **concepto**, el monto y el método. Los cobros de membresías y ventas se registran solos.
- Ver el resumen y editar o borrar movimientos: Propietario y Administrador.
- Las categorías se gestionan en [Conceptos](/concepts).`,
      en: `In [Finances](/finances) click **New**, choose income or expense, the **concept**, amount and method. Membership and sales payments are recorded automatically.
- Summary and editing or deleting entries: Owner and Administrator.
- Categories are managed in [Concepts](/concepts).`,
    },
  },
  {
    id: 'concepts',
    title: { es: '¿Para qué sirven los conceptos?', en: 'What are concepts for?' },
    keywords: { es: ['conceptos', 'categoria', 'clasificar gastos'], en: ['concepts', 'categories', 'classify expenses'] },
    roles: DESK,
    related: ['finances'],
    answer: {
      es: `Los [Conceptos](/concepts) son las categorías para clasificar ingresos y egresos (p. ej. "Luz", "Mantenimiento", "Suplementos"). Así los reportes de [Finanzas](/finances) muestran en qué se gasta y de dónde entra el dinero.`,
      en: `[Concepts](/concepts) are the categories used to classify income and expenses (e.g. "Electricity", "Maintenance", "Supplements"). That way the [Finances](/finances) reports show where money goes and comes from.`,
    },
  },
  {
    id: 'reports',
    title: { es: '¿Dónde veo los reportes del gimnasio?', en: 'Where are the gym reports?' },
    keywords: {
      es: ['reporte', 'estadisticas', 'indicadores', 'resumen', 'kpi', 'graficos', 'cuantos socios'],
      en: ['reports', 'statistics', 'kpi', 'charts', 'overview', 'dashboard'],
    },
    roles: ADMINS,
    related: ['finances', 'export'],
    answer: {
      es: `El [Dashboard](/dashboard) resume socios, asistencia, ingresos, egresos, membresías, ventas, cumpleaños y aforo. Está disponible para Propietario y Administrador.`,
      en: `The [Dashboard](/dashboard) summarizes members, attendance, income, expenses, memberships, sales, birthdays and occupancy. It's available to Owner and Administrator.`,
    },
  },
  {
    id: 'export',
    title: { es: '¿Cómo exporto una lista a Excel?', en: 'How do I export a list?' },
    keywords: { es: ['exportar', 'excel', 'csv', 'descargar lista', 'bajar datos'], en: ['export', 'download list', 'csv', 'excel'] },
    roles: DESK,
    related: ['import'],
    answer: {
      es: `En las tablas (Socios, Membresías, Pagos, etc.) usa el botón **Exportar**: descarga un archivo **CSV** que se abre en Excel o Google Sheets con las filas filtradas.`,
      en: `In tables (Members, Memberships, Payments, etc.) use the **Export** button: it downloads a **CSV** file that opens in Excel or Google Sheets with the filtered rows.`,
    },
  },

  // --- Operación ---
  {
    id: 'sales',
    title: { es: '¿Cómo vendo un producto?', en: 'How do I sell a product?' },
    keywords: {
      es: ['vender', 'venta', 'punto venta', 'pos', 'vender producto', 'vender servicio', 'agua', 'suplemento'],
      en: ['sell', 'sale', 'point of sale', 'pos', 'sell product'],
    },
    roles: DESK,
    related: ['products', 'payment-register'],
    answer: {
      es: `1. Ve a [Ventas](/sales) y pulsa **Nueva venta**.
2. Agrega los productos o servicios y las cantidades.
3. Registra el pago y confirma.

El stock de los productos se descuenta solo y la venta entra en Finanzas.`,
      en: `1. Go to [Sales](/sales) and click **New sale**.
2. Add the products or services and quantities.
3. Record the payment and confirm.

Product stock is deducted automatically and the sale goes into Finances.`,
    },
  },
  {
    id: 'products',
    title: { es: '¿Cómo manejo el inventario?', en: 'How do I manage inventory?' },
    keywords: {
      es: ['inventario', 'stock', 'producto', 'crear producto', 'existencia', 'sku', 'stock bajo', 'reponer'],
      en: ['inventory', 'stock', 'product', 'create product', 'sku', 'low stock'],
    },
    roles: DESK,
    related: ['sales'],
    answer: {
      es: `En [Productos](/products) creas productos con precio, SKU y **stock**, y ajustas las existencias cuando repones. El sistema avisa cuando hay **stock bajo**. Solo el Administrador puede eliminar productos.`,
      en: `In [Products](/products) you create products with price, SKU and **stock**, and adjust quantities when restocking. The system warns about **low stock**. Only the Administrator can delete products.`,
    },
  },
  {
    id: 'services',
    title: { es: '¿Para qué son los servicios?', en: 'What are services for?' },
    keywords: { es: ['servicio', 'clase extra', 'clases pagadas', 'entrenamiento personal'], en: ['service', 'extra class', 'personal training'] },
    roles: DESK,
    related: ['sales', 'schedules'],
    answer: {
      es: `En [Servicios](/services) registras lo que se cobra aparte de la membresía (clases especiales, entrenamiento personal, etc.). Luego se venden en [Ventas](/sales).`,
      en: `In [Services](/services) you register what's charged separately from the membership (special classes, personal training, etc.). Then you sell them in [Sales](/sales).`,
    },
  },
  {
    id: 'schedules',
    title: { es: '¿Cómo configuro los horarios?', en: 'How do I set up schedules?' },
    keywords: { es: ['horario', 'turno', 'agenda', 'clases horario', 'calendario'], en: ['schedule', 'shift', 'timetable', 'calendar', 'classes'] },
    roles: DESK,
    related: ['trainer-create'],
    answer: {
      es: `En [Horarios](/schedules) creas los turnos y clases con día, hora y entrenador. Crear y editar: Administrador y Personal; eliminar: Administrador.`,
      en: `In [Schedules](/schedules) you create shifts and classes with day, time and trainer. Create and edit: Administrator and Staff; delete: Administrator.`,
    },
  },

  // --- Equipo y entrenamiento ---
  {
    id: 'trainer-create',
    title: { es: '¿Cómo agrego un entrenador?', en: 'How do I add a trainer?' },
    keywords: { es: ['crear entrenador', 'agregar entrenador', 'nuevo entrenador', 'promover entrenador'], en: ['add trainer', 'create trainer', 'new trainer'] },
    roles: ADMINS,
    related: ['user-create', 'routine-create'],
    answer: {
      es: `En [Entrenadores](/trainers) pulsa **Nuevo**. Puedes:
- **Crear uno nuevo** con nombre, correo y contraseña, o
- **Promover a un usuario existente** (conserva sus otros roles, p. ej. si también es socio).

También puedes darle el rol Entrenador desde [Usuarios](/users) → **Roles**.`,
      en: `In [Trainers](/trainers) click **New**. You can:
- **Create a new one** with name, email and password, or
- **Promote an existing user** (keeps their other roles, e.g. if they're also a member).

You can also give the Trainer role from [Users](/users) → **Roles**.`,
    },
  },
  {
    id: 'routine-create',
    title: { es: '¿Cómo creo una rutina?', en: 'How do I create a routine?' },
    keywords: {
      es: ['crear rutina', 'rutina', 'plan entrenamiento', 'asignar rutina', 'rutina socio', 'generar rutina', 'rutina ia'],
      en: ['create routine', 'routine', 'workout plan', 'assign routine', 'generate routine'],
    },
    roles: COACH,
    related: ['exercises', 'progress'],
    answer: {
      es: `1. Ve a [Rutinas](/routines) y pulsa **Nueva**.
2. Elige el socio y agrega ejercicios con series, repeticiones y descanso.
3. Opcional: usa **Generar con IA** para obtener un borrador según el objetivo y la ficha médica del socio. **Revísalo** antes de guardar.

El socio la ve en su portal y puede marcarla como completada.`,
      en: `1. Go to [Routines](/routines) and click **New**.
2. Choose the member and add exercises with sets, reps and rest.
3. Optional: use **Generate with AI** to get a draft based on the member's goal and medical record. **Review it** before saving.

The member sees it in their portal and can mark it as completed.`,
    },
  },
  {
    id: 'exercises',
    title: { es: '¿Cómo agrego ejercicios al catálogo?', en: 'How do I add exercises?' },
    keywords: { es: ['ejercicio', 'catalogo ejercicios', 'crear ejercicio', 'maquina', 'musculo'], en: ['exercise', 'exercise catalog', 'add exercise', 'muscle'] },
    roles: COACH,
    related: ['routine-create'],
    answer: {
      es: `En [Ejercicios](/exercises) creas el catálogo (nombre, grupo muscular, equipo). Esos ejercicios luego se usan al armar [Rutinas](/routines).`,
      en: `In [Exercises](/exercises) you build the catalog (name, muscle group, equipment). Those exercises are then used when building [Routines](/routines).`,
    },
  },
  {
    id: 'progress',
    title: { es: '¿Dónde registro medidas y peso?', en: 'Where do I record measurements?' },
    keywords: { es: ['medidas', 'peso', 'medicion', 'progreso', 'evolucion', 'grasa corporal', 'imc'], en: ['measurements', 'weight', 'progress', 'body fat', 'bmi'] },
    roles: TEAM,
    related: ['health', 'routine-create'],
    answer: {
      es: `En [Progreso](/progress) eliges al socio y agregas una **medición** (peso, medidas). El sistema muestra su evolución en el tiempo y el socio la ve en su portal. Eliminar mediciones: solo Administrador.`,
      en: `In [Progress](/progress) choose the member and add a **measurement** (weight, body measurements). The system shows their evolution over time and the member sees it in their portal. Deleting measurements: Administrator only.`,
    },
  },
  {
    id: 'health',
    title: { es: '¿Dónde está la ficha médica?', en: 'Where is the medical record?' },
    keywords: {
      es: ['ficha medica', 'salud', 'lesion', 'alergia', 'medicamento', 'condicion', 'hipertension', 'diabetes', 'contacto emergencia'],
      en: ['medical record', 'health', 'injury', 'allergy', 'medication', 'emergency contact'],
    },
    roles: TEAM,
    related: ['progress', 'routine-create'],
    answer: {
      es: `- [Salud](/health): condiciones (hipertensión, diabetes…), lesiones, alergias y medicamentos del socio.
- [Emergencia](/emergency-contacts): a quién llamar en caso de emergencia.

La ficha médica también se usa para adaptar las rutinas generadas con IA.`,
      en: `- [Health](/health): the member's conditions (hypertension, diabetes…), injuries, allergies and medication.
- [Emergency](/emergency-contacts): who to call in an emergency.

The medical record is also used to adapt AI-generated routines.`,
    },
  },

  // --- Comunidad y retención ---
  {
    id: 'challenges',
    title: { es: '¿Cómo creo un reto?', en: 'How do I create a challenge?' },
    keywords: { es: ['reto', 'crear reto', 'desafio', 'competencia', 'ranking', 'tabla posiciones'], en: ['challenge', 'create challenge', 'competition', 'leaderboard', 'ranking'] },
    roles: COACH,
    related: ['gamification'],
    answer: {
      es: `En [Retos](/challenges) pulsa **Nuevo**, define el objetivo (p. ej. asistencias en un mes), las fechas y el premio. Los socios lo ven en su portal con la **tabla de posiciones**. Eliminar retos: solo Administrador.`,
      en: `In [Challenges](/challenges) click **New**, set the goal (e.g. check-ins in a month), dates and prize. Members see it in their portal with the **leaderboard**. Deleting challenges: Administrator only.`,
    },
  },
  {
    id: 'automations',
    title: { es: '¿Cómo envío recordatorios automáticos?', en: 'How do I send automatic reminders?' },
    keywords: {
      es: ['recordatorio', 'whatsapp', 'mensaje automatico', 'notificacion', 'avisar vencimiento', 'correo automatico', 'cumpleanos mensaje'],
      en: ['reminder', 'whatsapp', 'automatic message', 'notification', 'email automation'],
    },
    roles: DESK,
    related: ['inactive', 'message-logs'],
    answer: {
      es: `En [Mensajes automáticos](/automations) configuras recordatorios (por ejemplo, de vencimiento de membresía, inactividad o cumpleaños) con su plantilla. Puedes **previsualizar** el mensaje antes de activarlo. Crear automatizaciones: Administrador.

Lo enviado queda en [Envíos](/message-logs).`,
      en: `In [Automatic messages](/automations) you set up reminders (for example, membership expiry, inactivity or birthdays) with their template. You can **preview** the message before enabling it. Creating automations: Administrator.

What was sent appears in [Message log](/message-logs).`,
    },
  },
  {
    id: 'inactive',
    title: { es: '¿Cómo veo los socios que dejaron de venir?', en: 'How do I see members who stopped coming?' },
    keywords: { es: ['inactivo', 'dejaron venir', 'ausente', 'no vienen', 'abandono', 'recuperar socio'], en: ['inactive', 'stopped coming', 'churn', 'absent'] },
    roles: TEAM,
    related: ['automations'],
    answer: {
      es: `[Socios inactivos](/inactive-members) lista a quienes llevan tiempo sin asistir, para contactarlos. Puedes automatizar el contacto en [Mensajes automáticos](/automations).`,
      en: `[Inactive members](/inactive-members) lists those who haven't come in a while so you can reach out. You can automate it in [Automatic messages](/automations).`,
    },
  },
  {
    id: 'message-logs',
    title: { es: '¿Dónde veo los mensajes enviados?', en: 'Where are the sent messages?' },
    keywords: { es: ['mensajes enviados', 'historial mensajes', 'envios'], en: ['sent messages', 'message log', 'message history'] },
    roles: DESK,
    related: ['automations'],
    answer: {
      es: `En [Envíos](/message-logs) está el historial de mensajes automáticos enviados, con su estado.`,
      en: `[Message log](/message-logs) has the history of automatic messages sent, with their status.`,
    },
  },
  {
    id: 'referrals-staff',
    title: { es: '¿Cómo funcionan los referidos?', en: 'How do referrals work?' },
    keywords: { es: ['referido', 'recomendacion', 'invitar', 'trae amigo'], en: ['referral', 'invite', 'bring a friend'] },
    roles: DESK,
    related: ['gamification'],
    answer: {
      es: `Cada socio tiene un enlace para invitar amigos desde su portal. En [Referidos](/referrals) ves quién recomendó a quién y puedes registrar un referido manualmente.`,
      en: `Each member has a link in their portal to invite friends. In [Referrals](/referrals) you see who referred whom and can record a referral manually.`,
    },
  },
  {
    id: 'gamification',
    title: { es: '¿Cómo configuro puntos y recompensas?', en: 'How do I set up points and rewards?' },
    keywords: {
      es: ['puntos', 'recompensa', 'premio', 'insignia', 'nivel', 'canje', 'gamificacion', 'logro'],
      en: ['points', 'reward', 'prize', 'badge', 'tier', 'redemption', 'gamification'],
    },
    roles: ADMINS,
    related: ['challenges', 'member-points'],
    answer: {
      es: `Los socios ganan **puntos** (por ejemplo, al asistir), suben de **nivel**, obtienen **insignias** y canjean **recompensas** desde su portal. Se configura en:
- [Recompensas](/rewards) y [Canjes](/redemptions)
- [Insignias](/badges) y [Niveles](/tiers)`,
      en: `Members earn **points** (for example, by checking in), level up **tiers**, unlock **badges** and redeem **rewards** from their portal. Configure it in:
- [Rewards](/rewards) and [Redemptions](/redemptions)
- [Badges](/badges) and [Tiers](/tiers)`,
    },
  },

  // --- Administración ---
  {
    id: 'user-create',
    title: { es: '¿Cómo creo un usuario del personal?', en: 'How do I create a staff user?' },
    keywords: {
      es: ['crear usuario', 'nuevo usuario', 'agregar usuario', 'cuenta personal', 'recepcionista', 'crear administrador', 'dar acceso'],
      en: ['create user', 'new user', 'add user', 'staff account', 'create admin', 'give access'],
    },
    roles: ADMINS,
    related: ['user-roles', 'user-password'],
    answer: {
      es: `1. Ve a [Usuarios](/users) y pulsa **Nuevo**.
2. Completa nombre, correo, **contraseña** y **confirmar contraseña** (mínimo 7 caracteres).
3. Marca uno o varios **roles**.

El rol Socio no se da aquí: se registra a la persona en [Socios](/members). Solo un Propietario puede dar el rol Propietario.`,
      en: `1. Go to [Users](/users) and click **New**.
2. Fill in name, email, **password** and **confirm password** (at least 7 characters).
3. Tick one or more **roles**.

The Member role isn't given here: register the person in [Members](/members). Only an Owner can grant the Owner role.`,
    },
  },
  {
    id: 'user-roles',
    title: { es: '¿Cómo cambio los roles de un usuario?', en: 'How do I change a user\'s roles?' },
    keywords: {
      es: ['cambiar rol usuario', 'asignar rol', 'roles usuario', 'permisos usuario', 'dar varios roles', 'quitar rol usuario', 'dar permisos'],
      en: ['change role', 'assign role', 'user roles', 'permissions', 'multiple roles'],
    },
    roles: ADMINS,
    related: ['switch-role', 'user-create'],
    answer: {
      es: `En [Usuarios](/users) → menú **⋮** → **Roles**, marca los roles que tendrá (puede tener varios).
- Si le **quitas** un rol, se cierran sus sesiones abiertas.
- Un Administrador no puede cambiar los roles del Propietario.
- Siempre debe quedar al menos un Propietario o Administrador.`,
      en: `In [Users](/users) → **⋮** menu → **Roles**, tick the roles they'll have (can be several).
- If you **remove** a role, their open sessions are signed out.
- An Administrator can't change the Owner's roles.
- There must always be at least one Owner or Administrator.`,
    },
  },
  {
    id: 'user-password',
    title: { es: '¿Cómo cambio la contraseña de un usuario?', en: 'How do I change a user\'s password?' },
    keywords: {
      es: ['cambiar contrasena', 'resetear contrasena', 'restablecer contrasena', 'nueva contrasena', 'contrasena usuario'],
      en: ['change password', 'reset password', 'new password', 'user password'],
    },
    roles: ADMINS,
    related: ['forgot-password', 'user-roles'],
    answer: {
      es: `En [Usuarios](/users) → menú **⋮** → **Cambiar contraseña**. Escribe la nueva y confírmala (mínimo 7 caracteres).
- Se cierran las sesiones abiertas de ese usuario.
- Un Administrador no puede cambiar la contraseña del Propietario.
- La contraseña de un socio se cambia editándolo en [Socios](/members).`,
      en: `In [Users](/users) → **⋮** menu → **Change password**. Type the new one and confirm it (at least 7 characters).
- That user's open sessions are signed out.
- An Administrator can't change the Owner's password.
- A member's password is changed by editing them in [Members](/members).`,
    },
  },
  {
    id: 'forgot-password',
    title: { es: 'Olvidé mi contraseña', en: 'I forgot my password' },
    keywords: {
      es: ['olvide contrasena', 'olvido contrasena', 'recuperar contrasena', 'no recuerdo contrasena', 'no puedo entrar', 'perdi contrasena'],
      en: ['forgot password', 'recover password', 'cant log in', 'lost password'],
    },
    related: ['user-password'],
    answer: {
      es: `Por ahora la recuperación por correo no está disponible. Pídele a un **Administrador** que te asigne una contraseña nueva:
- Personal: desde Usuarios → **Cambiar contraseña**.
- Socios: en recepción, editando tu ficha de socio.`,
      en: `Email recovery isn't available yet. Ask an **Administrator** to set a new password for you:
- Staff: from Users → **Change password**.
- Members: at the front desk, by editing your member record.`,
    },
  },
  {
    id: 'switch-role',
    title: { es: '¿Cómo cambio de rol?', en: 'How do I switch roles?' },
    keywords: {
      es: ['cambiar de rol', 'cambiarme de rol', 'mi rol', 'entrar como', 'otro rol', 'elegir rol', 'tengo dos roles', 'selector rol'],
      en: ['switch role', 'sign in as', 'other role', 'choose role'],
    },
    related: ['user-roles'],
    answer: {
      es: `Si tu cuenta tiene varios roles:
- Al **iniciar sesión** eliges con cuál entrar.
- Ya dentro, usa el menú **Cambiar de rol** del encabezado (junto al idioma). No hace falta cerrar sesión.

Si no ves el menú, tu cuenta tiene un solo rol.`,
      en: `If your account has several roles:
- When **signing in** you choose which one to use.
- Once inside, use the **Switch role** menu in the header (next to the language). No need to sign out.

If you don't see the menu, your account has a single role.`,
    },
  },
  {
    id: 'session-timeout',
    title: { es: '¿Por qué se cerró mi sesión?', en: 'Why was I signed out?' },
    keywords: {
      es: ['sesion cerro', 'me saco', 'cierra sesion', 'inactividad', 'sesion expiro', 'me desconecta', 'tiempo sesion'],
      en: ['signed out', 'session expired', 'logged out', 'inactivity', 'session timeout'],
    },
    answer: {
      es: `Por seguridad, la sesión se cierra tras **30 minutos sin actividad**. Dos minutos antes aparece el aviso **"¿Sigues ahí?"**: pulsa **Seguir conectado** para continuar. Mientras uses el sistema, la sesión se mantiene hasta 7 días.

También se cierra si un administrador te cambia la contraseña o te quita un rol.`,
      en: `For security, the session ends after **30 minutes of inactivity**. Two minutes before, the **"Are you still there?"** notice appears: click **Stay signed in** to continue. While you use the system, the session lasts up to 7 days.

It also ends if an administrator changes your password or removes one of your roles.`,
    },
  },
  {
    id: 'import',
    title: { es: '¿Cómo importo socios desde Excel?', en: 'How do I import members from Excel?' },
    keywords: {
      es: ['importar', 'carga masiva', 'subir excel', 'migrar datos', 'importar socios', 'importar asistencia', 'csv'],
      en: ['import', 'bulk upload', 'upload excel', 'migrate data', 'import members'],
    },
    roles: ADMINS,
    related: ['export'],
    answer: {
      es: `En [Importar datos](/import) subes un archivo **Excel o CSV** con socios (y opcionalmente asistencias). Verás una **vista previa** con los errores a corregir antes de confirmar la importación.`,
      en: `In [Import data](/import) you upload an **Excel or CSV** file with members (and optionally attendance). You'll see a **preview** with the errors to fix before confirming the import.`,
    },
  },
  {
    id: 'settings',
    title: { es: '¿Dónde cambio los datos del gimnasio?', en: 'Where do I change the gym details?' },
    keywords: {
      es: ['configuracion', 'datos gimnasio', 'nombre gimnasio', 'capacidad', 'aforo maximo', 'logo', 'ajuste'],
      en: ['settings', 'gym details', 'gym name', 'capacity', 'logo'],
    },
    roles: DESK,
    related: ['signup-link'],
    answer: {
      es: `En [Configuración](/settings) están los datos del gimnasio, la **capacidad** (aforo) y el nombre corto del enlace de inscripción. El Personal puede verla; solo Propietario y Administrador pueden editarla.`,
      en: `[Settings](/settings) has the gym details, **capacity** (occupancy) and the short name of the signup link. Staff can view it; only Owner and Administrator can edit it.`,
    },
  },
  {
    id: 'audit',
    title: { es: '¿Cómo veo quién hizo un cambio?', en: 'How do I see who made a change?' },
    keywords: { es: ['auditoria', 'quien hizo', 'bitacora', 'historial cambios', 'registro acciones', 'log'], en: ['audit', 'who did', 'activity log', 'change history'] },
    roles: ADMINS,
    answer: {
      es: `En [Auditoría](/audit-logs) está el registro de acciones: inicios de sesión, cambios de contraseña, cambios de rol y más, con fecha, usuario y detalle.`,
      en: `[Audit log](/audit-logs) records actions: sign-ins, password changes, role changes and more, with date, user and details.`,
    },
  },
  {
    id: 'search',
    title: { es: '¿Cómo busco algo rápido?', en: 'How do I find something quickly?' },
    keywords: { es: ['buscar', 'buscador', 'encontrar socio', 'buscar cedula', 'buscar producto'], en: ['search', 'find member', 'find', 'lookup'] },
    roles: TEAM,
    answer: {
      es: `Usa el **buscador** de la barra superior: encuentra socios por nombre, cédula o correo, productos por SKU, planes, servicios, entrenadores, ejercicios y pantallas. También tiene acciones rápidas como **Registrar socio** y **Registrar entrada**.`,
      en: `Use the **search bar** at the top: it finds members by name, ID number or email, products by SKU, plans, services, trainers, exercises and screens. It also has quick actions like **Register member** and **Check in**.`,
    },
  },
  {
    id: 'appearance',
    title: { es: '¿Cómo cambio el idioma o el tema?', en: 'How do I change language or theme?' },
    keywords: { es: ['idioma', 'ingles', 'espanol', 'tema oscuro', 'modo oscuro', 'modo claro'], en: ['language', 'english', 'spanish', 'dark mode', 'light mode', 'theme'] },
    answer: {
      es: `En el encabezado tienes el botón de **idioma** (español/inglés) y el de **tema** (claro/oscuro).`,
      en: `In the header you have the **language** button (Spanish/English) and the **theme** button (light/dark).`,
    },
  },
];

// ---------------------------------------------------------------------------
// Portal del socio
// ---------------------------------------------------------------------------
const MEMBER_ENTRIES: Entry[] = [
  {
    id: 'member-membership',
    title: { es: '¿Cuándo vence mi membresía?', en: 'When does my membership expire?' },
    keywords: { es: ['mi membresia', 'cuando vence', 'vencimiento', 'dias quedan', 'mi plan'], en: ['my membership', 'when expire', 'expiry', 'my plan', 'days left'] },
    roles: MEMBER,
    related: ['member-renew'],
    answer: {
      es: `En [Membresía](/portal/membership) ves tu plan, su **estado** y la **fecha de vencimiento**.`,
      en: `In [Membership](/portal/membership) you see your plan, its **status** and the **expiry date**.`,
    },
  },
  {
    id: 'member-renew',
    title: { es: '¿Cómo renuevo o pago mi membresía?', en: 'How do I renew or pay my membership?' },
    keywords: { es: ['renovar', 'pagar', 'pagar membresia', 'renovar membresia', 'mensualidad'], en: ['renew', 'pay', 'pay membership'] },
    roles: MEMBER,
    related: ['member-membership'],
    answer: {
      es: `Los pagos y renovaciones se hacen en **recepción** del gimnasio. Allí registran tu pago y tu membresía se actualiza al instante; lo verás en [Membresía](/portal/membership).`,
      en: `Payments and renewals are done at the gym's **front desk**. They record your payment and your membership updates instantly; you'll see it in [Membership](/portal/membership).`,
    },
  },
  {
    id: 'member-checkin',
    title: { es: '¿Cómo marco mi entrada?', en: 'How do I check in?' },
    keywords: { es: ['marcar entrada', 'checkin', 'registrar asistencia', 'llegue', 'aforo', 'cuanta gente'], en: ['check in', 'check out', 'occupancy', 'how busy'] },
    roles: MEMBER,
    answer: {
      es: `En [Asistencias](/portal/attendance) marca tu **entrada** al llegar y tu **salida** al irte. Ahí también ves el **aforo** actual y tu historial. Si tu membresía está vencida o suspendida, no podrás marcar la entrada.`,
      en: `In [Attendance](/portal/attendance) check **in** when you arrive and **out** when you leave. There you also see current **occupancy** and your history. If your membership is expired or suspended, you can't check in.`,
    },
  },
  {
    id: 'member-routine',
    title: { es: '¿Dónde veo mi rutina?', en: 'Where is my routine?' },
    keywords: { es: ['mi rutina', 'rutina', 'ejercicios', 'entrenamiento', 'completar rutina'], en: ['my routine', 'routine', 'workout', 'complete routine'] },
    roles: MEMBER,
    related: ['member-progress'],
    answer: {
      es: `En [Rutina](/portal/routine) está la rutina que te asignó tu entrenador. Al terminarla, márcala como **completada**. Si no tienes una, pídesela a tu entrenador.`,
      en: `In [Routine](/portal/routine) you'll find the routine your trainer assigned. When you finish it, mark it as **completed**. If you don't have one, ask your trainer.`,
    },
  },
  {
    id: 'member-progress',
    title: { es: '¿Dónde veo mi progreso?', en: 'Where is my progress?' },
    keywords: { es: ['mi progreso', 'medidas', 'peso', 'evolucion'], en: ['my progress', 'measurements', 'weight'] },
    roles: MEMBER,
    answer: {
      es: `En [Progreso](/portal/progress) ves tus mediciones (peso, medidas) y su evolución. Las registra tu entrenador o el personal del gimnasio.`,
      en: `In [Progress](/portal/progress) you see your measurements (weight, body measurements) and how they evolve. Your trainer or gym staff record them.`,
    },
  },
  {
    id: 'member-points',
    title: { es: '¿Cómo gano y canjeo puntos?', en: 'How do I earn and redeem points?' },
    keywords: { es: ['puntos', 'ganar puntos', 'mis puntos', 'canjear', 'recompensa', 'premio', 'insignia', 'nivel'], en: ['points', 'earn points', 'redeem', 'reward', 'badge', 'tier'] },
    roles: MEMBER,
    related: ['member-challenges'],
    answer: {
      es: `Ganas **puntos** con tu actividad en el gimnasio (por ejemplo, al asistir) y con retos e insignias. Canjéalos en [Recompensas](/portal/rewards). Tu nivel y tus insignias están en [Inicio](/portal).`,
      en: `You earn **points** through your gym activity (for example, checking in) and with challenges and badges. Redeem them in [Rewards](/portal/rewards). Your tier and badges are on [Home](/portal).`,
    },
  },
  {
    id: 'member-challenges',
    title: { es: '¿Cómo participo en un reto?', en: 'How do I join a challenge?' },
    keywords: { es: ['reto', 'desafio', 'ranking', 'competencia'], en: ['challenge', 'leaderboard', 'competition'] },
    roles: MEMBER,
    answer: {
      es: `En [Retos](/portal/challenges) ves los retos activos, tu posición en la **tabla** y los premios.`,
      en: `In [Challenges](/portal/challenges) you see active challenges, your position on the **leaderboard** and the prizes.`,
    },
  },
  {
    id: 'member-referral',
    title: { es: '¿Cómo invito a un amigo?', en: 'How do I invite a friend?' },
    keywords: { es: ['invitar amigo', 'referido', 'recomendar', 'enlace invitar'], en: ['invite friend', 'referral', 'refer'] },
    roles: MEMBER,
    answer: {
      es: `En [Referidos](/portal/referrals) copia tu **enlace personal** y compártelo. Cuando tu amigo se inscribe con él, queda registrado como tu referido.`,
      en: `In [Referrals](/portal/referrals) copy your **personal link** and share it. When your friend signs up with it, they're recorded as your referral.`,
    },
  },
  {
    id: 'member-profile',
    title: { es: '¿Cómo actualizo mis datos?', en: 'How do I update my details?' },
    keywords: { es: ['mi perfil', 'mis datos', 'cambiar telefono', 'actualizar datos', 'mi correo'], en: ['my profile', 'my details', 'update phone', 'my email'] },
    roles: MEMBER,
    related: ['forgot-password'],
    answer: {
      es: `En [Mi perfil](/portal/profile) puedes actualizar tus datos de contacto. Para cambiar tu contraseña, pídelo en recepción.`,
      en: `In [My profile](/portal/profile) you can update your contact details. To change your password, ask at the front desk.`,
    },
  },
];

// ---------------------------------------------------------------------------
// Conversación
// ---------------------------------------------------------------------------
const SMALL_TALK: Entry[] = [
  {
    id: 'here',
    title: { es: '¿Qué hago en esta pantalla?', en: 'What can I do on this screen?' },
    keywords: { es: ['aqui', 'esta pantalla', 'esta pagina', 'donde estoy', 'para que sirve esto'], en: ['here', 'this screen', 'this page', 'where am i'] },
    answer: { es: '', en: '' }, // se reemplaza por la pantalla actual
  },
  {
    id: 'capabilities',
    title: { es: '¿Qué puedes hacer?', en: 'What can you do?' },
    keywords: { es: ['que puedes', 'quien eres', 'que sabes', 'como funcionas'], en: ['what can you do', 'who are you', 'how do you work'] },
    answer: {
      es: `Soy **Fragua**, el centro de ayuda de FraguaGo. Te explico **cómo hacer** las cosas en el sistema y dónde está cada opción. No accedo a los datos del gimnasio ni hago cambios por ti.

Prueba con "¿cómo renuevo una membresía?" o "¿qué hago en esta pantalla?".`,
      en: `I'm **Fragua**, FraguaGo's help center. I explain **how to do** things in the system and where each option is. I don't access the gym's data or make changes for you.

Try "how do I renew a membership?" or "what can I do on this screen?".`,
    },
  },
  {
    id: 'greeting',
    title: { es: 'Hola', en: 'Hi' },
    keywords: { es: ['hola', 'buenas', 'buenos dias', 'buenas tardes', 'buenas noches', 'saludos'], en: ['hello', 'hi', 'hey', 'good morning', 'good afternoon'] },
    // La UI agrega los temas sugeridos del rol como botones.
    answer: {
      es: '¡Hola! ¿En qué te ayudo? Escribe tu duda o elige uno de estos temas:',
      en: 'Hi! How can I help? Type your question or pick one of these topics:',
    },
  },
  {
    id: 'thanks',
    title: { es: 'Gracias', en: 'Thanks' },
    keywords: { es: ['gracias', 'muchas gracias', 'perfecto', 'genial', 'listo'], en: ['thanks', 'thank you', 'great', 'perfect'] },
    answer: { es: '¡Con gusto! Si tienes otra duda, aquí estoy.', en: 'You\'re welcome! If you have another question, I\'m here.' },
  },
];

// ---------------------------------------------------------------------------
// Pantallas (generadas desde el menú: etiqueta + sinónimos de i18n)
// ---------------------------------------------------------------------------
const PAGE_INFO: { key: NavItemKey; href: string; roles: Role[]; desc: L }[] = [
  { key: 'dashboard', href: '/dashboard', roles: ADMINS, desc: { es: 'resumen de socios, asistencia, ingresos, egresos, membresías, ventas, cumpleaños y aforo.', en: 'overview of members, attendance, income, expenses, memberships, sales, birthdays and occupancy.' } },
  { key: 'members', href: '/members', roles: TEAM, desc: { es: 'lista de socios: registrar, editar, ver su ficha, carnet, historial y puntos. Desde aquí copias el enlace de inscripción.', en: 'member list: register, edit, view their record, card, history and points. You copy the signup link from here.' } },
  { key: 'attendance', href: '/attendance', roles: TEAM, desc: { es: 'registrar entradas y salidas, ver la asistencia del día, el aforo y el enlace público de check-in.', en: 'record check-ins and check-outs, today\'s attendance, occupancy and the public check-in link.' } },
  { key: 'health', href: '/health', roles: TEAM, desc: { es: 'ficha médica de los socios: condiciones, lesiones, alergias y medicamentos.', en: 'members\' medical records: conditions, injuries, allergies and medication.' } },
  { key: 'progress', href: '/progress', roles: TEAM, desc: { es: 'mediciones (peso, medidas) y evolución de cada socio.', en: 'measurements (weight, body) and each member\'s progress.' } },
  { key: 'emergencyContacts', href: '/emergency-contacts', roles: TEAM, desc: { es: 'contactos de emergencia de los socios.', en: 'members\' emergency contacts.' } },
  { key: 'memberships', href: '/memberships', roles: TEAM, desc: { es: 'membresías de los socios: asignar, renovar, suspender, reactivar o cancelar (menú ⋮ de cada fila).', en: 'members\' memberships: assign, renew, suspend, reactivate or cancel (⋮ menu on each row).' } },
  { key: 'membershipPlans', href: '/membership-plans', roles: TEAM, desc: { es: 'planes con precio y duración. Crear y editar: Propietario y Administrador.', en: 'plans with price and duration. Create and edit: Owner and Administrator.' } },
  { key: 'trainingGoals', href: '/training-goals', roles: TEAM, desc: { es: 'catálogo de objetivos de entrenamiento.', en: 'catalog of training goals.' } },
  { key: 'paymentRecords', href: '/payment-records', roles: DESK, desc: { es: 'historial de cobros y comprobantes.', en: 'history of payments and receipts.' } },
  { key: 'finances', href: '/finances', roles: DESK, desc: { es: 'ingresos, egresos y balance.', en: 'income, expenses and balance.' } },
  { key: 'exchangeRates', href: '/exchange-rates', roles: DESK, desc: { es: 'tasa del dólar/euro: sincronizar con el BCV o cargarla manualmente.', en: 'dollar/euro rate: sync with the BCV or enter it manually.' } },
  { key: 'sales', href: '/sales', roles: DESK, desc: { es: 'punto de venta de productos y servicios.', en: 'point of sale for products and services.' } },
  { key: 'concepts', href: '/concepts', roles: TEAM, desc: { es: 'categorías para clasificar ingresos y egresos.', en: 'categories to classify income and expenses.' } },
  { key: 'products', href: '/products', roles: TEAM, desc: { es: 'inventario: productos, precios, stock y alertas de stock bajo.', en: 'inventory: products, prices, stock and low-stock alerts.' } },
  { key: 'services', href: '/services', roles: TEAM, desc: { es: 'servicios o clases que se cobran aparte.', en: 'services or classes charged separately.' } },
  { key: 'challenges', href: '/challenges', roles: TEAM, desc: { es: 'retos para socios con tabla de posiciones.', en: 'member challenges with a leaderboard.' } },
  { key: 'automations', href: '/automations', roles: DESK, desc: { es: 'recordatorios y mensajes automáticos (vencimientos, inactividad, cumpleaños).', en: 'automatic reminders and messages (expiry, inactivity, birthdays).' } },
  { key: 'inactiveMembers', href: '/inactive-members', roles: TEAM, desc: { es: 'socios que dejaron de asistir, para contactarlos.', en: 'members who stopped coming, to reach out to them.' } },
  { key: 'messageLogs', href: '/message-logs', roles: DESK, desc: { es: 'historial de mensajes enviados.', en: 'history of sent messages.' } },
  { key: 'referrals', href: '/referrals', roles: DESK, desc: { es: 'quién recomendó a quién.', en: 'who referred whom.' } },
  { key: 'rewards', href: '/rewards', roles: TEAM, desc: { es: 'recompensas que los socios canjean con sus puntos.', en: 'rewards members redeem with their points.' } },
  { key: 'redemptions', href: '/redemptions', roles: TEAM, desc: { es: 'canjes de recompensas hechos por los socios.', en: 'reward redemptions made by members.' } },
  { key: 'badges', href: '/badges', roles: TEAM, desc: { es: 'insignias que ganan los socios.', en: 'badges members earn.' } },
  { key: 'tiers', href: '/tiers', roles: TEAM, desc: { es: 'niveles de los socios según sus puntos.', en: 'member tiers based on points.' } },
  { key: 'trainers', href: '/trainers', roles: TEAM, desc: { es: 'entrenadores del gimnasio. Crear y editar: Propietario y Administrador.', en: 'the gym\'s trainers. Create and edit: Owner and Administrator.' } },
  { key: 'routines', href: '/routines', roles: TEAM, desc: { es: 'rutinas de los socios; se pueden generar borradores con IA. Crear y editar: Administrador y Entrenador.', en: 'members\' routines; drafts can be AI-generated. Create and edit: Administrator and Trainer.' } },
  { key: 'exercises', href: '/exercises', roles: TEAM, desc: { es: 'catálogo de ejercicios para armar rutinas.', en: 'exercise catalog for building routines.' } },
  { key: 'schedules', href: '/schedules', roles: TEAM, desc: { es: 'turnos y clases.', en: 'shifts and classes.' } },
  { key: 'users', href: '/users', roles: ADMINS, desc: { es: 'cuentas del personal: crear, roles (menú ⋮ → Roles) y contraseñas (menú ⋮ → Cambiar contraseña).', en: 'staff accounts: create, roles (⋮ menu → Roles) and passwords (⋮ menu → Change password).' } },
  { key: 'import', href: '/import', roles: ADMINS, desc: { es: 'carga masiva de socios y asistencias desde Excel o CSV.', en: 'bulk upload of members and attendance from Excel or CSV.' } },
  { key: 'settings', href: '/settings', roles: DESK, desc: { es: 'datos del gimnasio, capacidad y enlace de inscripción.', en: 'gym details, capacity and signup link.' } },
  { key: 'auditLogs', href: '/audit-logs', roles: ADMINS, desc: { es: 'registro de acciones del sistema.', en: 'system action log.' } },
];

const PORTAL_PAGES: { href: string; es: string; en: string; desc: L; keywords: string[] }[] = [
  { href: '/portal', es: 'Inicio', en: 'Home', keywords: ['inicio', 'home'], desc: { es: 'tu resumen: membresía, puntos, nivel e insignias.', en: 'your overview: membership, points, tier and badges.' } },
  { href: '/portal/membership', es: 'Membresía', en: 'Membership', keywords: ['membresia'], desc: { es: 'tu plan, estado y fecha de vencimiento.', en: 'your plan, status and expiry date.' } },
  { href: '/portal/attendance', es: 'Asistencias', en: 'Attendance', keywords: ['asistencia'], desc: { es: 'marca tu entrada y salida, mira el aforo y tu historial.', en: 'check in and out, see occupancy and your history.' } },
  { href: '/portal/routine', es: 'Rutina', en: 'Routine', keywords: ['rutina'], desc: { es: 'la rutina que te asignó tu entrenador.', en: 'the routine your trainer assigned.' } },
  { href: '/portal/progress', es: 'Progreso', en: 'Progress', keywords: ['progreso'], desc: { es: 'tus mediciones y evolución.', en: 'your measurements and progress.' } },
  { href: '/portal/challenges', es: 'Retos', en: 'Challenges', keywords: ['reto'], desc: { es: 'retos activos y tabla de posiciones.', en: 'active challenges and leaderboard.' } },
  { href: '/portal/rewards', es: 'Recompensas', en: 'Rewards', keywords: ['recompensa'], desc: { es: 'canjea tus puntos por recompensas.', en: 'redeem your points for rewards.' } },
  { href: '/portal/referrals', es: 'Referidos', en: 'Referrals', keywords: ['referido'], desc: { es: 'tu enlace para invitar amigos.', en: 'your link to invite friends.' } },
  { href: '/portal/profile', es: 'Mi perfil', en: 'My profile', keywords: ['perfil'], desc: { es: 'tus datos de contacto.', en: 'your contact details.' } },
];

function pageEntry(label: L, href: string, desc: L, keywords: { es: string[]; en: string[] }, roles: Role[]): Entry {
  return {
    id: `page:${href}`,
    page: href,
    roles,
    title: { es: `¿Qué es ${label.es}?`, en: `What is ${label.en}?` },
    keywords,
    answer: {
      es: `**[${label.es}](${href})**: ${desc.es}`,
      en: `**[${label.en}](${href})**: ${desc.en}`,
    },
  };
}

const splitKeywords = (value: string) => value.split(',').map((k) => k.trim()).filter(Boolean);

const PAGES: Entry[] = [
  ...PAGE_INFO.map(({ key, href, roles, desc }) => pageEntry(
    { es: es.nav.items[key], en: en.nav.items[key] },
    href,
    desc,
    {
      es: [es.nav.items[key], ...splitKeywords(es.nav.keywords[key])],
      en: [en.nav.items[key], ...splitKeywords(en.nav.keywords[key])],
    },
    roles,
  )),
  ...PORTAL_PAGES.map((p) => pageEntry({ es: p.es, en: p.en }, p.href, p.desc, { es: [p.es, ...p.keywords], en: [p.en] }, MEMBER)),
];

export const ENTRIES: Entry[] = [...TASKS, ...MEMBER_ENTRIES, ...SMALL_TALK, ...PAGES];

// Sugerencias iniciales por tipo de usuario.
export const STARTERS: Record<'desk' | 'trainer' | 'member', string[]> = {
  desk: ['member-create', 'membership-renew', 'membership-suspend-vs-cancel', 'checkin', 'here'],
  trainer: ['routine-create', 'progress', 'challenges', 'switch-role', 'here'],
  member: ['member-membership', 'member-points', 'member-referral', 'member-checkin'],
};
