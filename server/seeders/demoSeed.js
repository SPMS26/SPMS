// Realistic demo data that sits alongside existing data and can be removed again.
//   npm run seed:demo        replaces any earlier demo data with a fresh set
//   npm run seed:demo:clear  removes the demo data only
// Unlike `npm run seed`, this never drops tables. Dates are relative to today, so re-run it to refresh them.
import 'dotenv/config';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import db from '../config/database.js';
import { generateQRPayload } from '../services/qrGenerator.js';

const DOMAIN = 'seed.spms.test'; // reserved domain: every demo account is found by this
const PASSWORD = 'demo1234';
const HISTORY_DAYS = 180;
const REF = 'SEED'; // prefix on demo payment references
const MINUTE = 60000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

// Same random choices on every run, so the data is reproducible
let randomState = 20261105;
const random = () => {
  randomState = (randomState + 0x6d2b79f5) | 0;
  let t = Math.imul(randomState ^ (randomState >>> 15), 1 | randomState);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const between = (min, max) => min + Math.floor(random() * (max - min + 1));
const pick = (list) => list[Math.floor(random() * list.length)];
const chance = (p) => random() < p;
const shuffled = (list) => {
  const copy = [...list];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
};
const weighted = (weights) => {
  const entries = Object.entries(weights);
  let roll = random() * entries.reduce((sum, [, w]) => sum + w, 0);
  for (const [value, weight] of entries) {
    roll -= weight;
    if (roll <= 0) return Number(value);
  }
  return Number(entries[0][0]);
};

const FIRST_NAMES = ['Aarav', 'Vivaan', 'Aditi', 'Ananya', 'Arjun', 'Bhavana', 'Chetan', 'Deepika', 'Divya', 'Farhan', 'Gayatri', 'Harsha', 'Ishaan', 'Jyothi', 'Karthik', 'Kavya', 'Lakshmi', 'Manoj', 'Meera', 'Naveen', 'Neha', 'Omkar', 'Pooja', 'Pranav', 'Rahul', 'Ramya', 'Sai', 'Sandeep', 'Shreya', 'Siddharth', 'Sneha', 'Srinivas', 'Swathi', 'Tarun', 'Uday', 'Varun', 'Vidya', 'Vikram', 'Yamini', 'Zoya'];
const LAST_NAMES = ['Reddy', 'Sharma', 'Rao', 'Iyer', 'Nair', 'Gupta', 'Patel', 'Verma', 'Kumar', 'Naidu', 'Menon', 'Khan', 'Das', 'Joshi', 'Pillai', 'Varma'];
const CARS = ['Maruti Swift', 'Hyundai Creta', 'Tata Nexon', 'Honda City', 'Kia Seltos', 'Mahindra XUV700', 'Toyota Innova', 'Hyundai i20', 'Tata Punch', 'Maruti Baleno'];
const BIKES = ['Honda Activa', 'Royal Enfield Classic 350', 'TVS Jupiter', 'Bajaj Pulsar 150', 'Yamaha FZ', 'Ather 450X', 'Suzuki Access', 'Hero Splendor'];
const COLORS = ['White', 'Black', 'Silver', 'Red', 'Blue', 'Grey', 'Brown'];
const STATES = [['TS', 9], ['TS', 7], ['AP', 39], ['KA', 1], ['MH', 12], ['TN', 22]];

const OWNERS = [
  { name: 'Rohan Mehta', email: 'rohan.mehta', organization: 'Metro Mall Parking Pvt Ltd' },
  { name: 'Dr. Anjali Rao', email: 'anjali.rao', organization: 'Greenfield Hospitals' },
  { name: 'Suresh Kulkarni', email: 'suresh.kulkarni', organization: 'Apex Tech Park' }
];

const car = (floor, sections, price) => ({ floor, sections, price, type: 'car' });
const bike = (floor, sections, price) => ({ floor, sections, price, type: 'bike' });

const LOTS = [
  { owner: 0, name: 'Metro Mall Parking', address: 'Road No. 36, Jubilee Hills, Hyderabad', lat: 17.4326, lng: 78.4071, open: '09:00', close: '23:30', phone: '+914023001100', fee: 20, price: 50, profile: 'retail', demand: 1.3, layout: [car('B1', ['A', 'B'], 50), car('GF', ['C'], 60), bike('GF', ['M'], 20)], description: 'Covered multi-level parking for the mall, with valet at the main entrance.' },
  { owner: 0, name: 'City Centre Plaza', address: 'Banjara Hills, Hyderabad', lat: 17.4156, lng: 78.4347, open: '10:00', close: '22:00', phone: '+914023001200', fee: 15, price: 40, profile: 'retail', demand: 1, layout: [car('GF', ['A', 'B'], 40), bike('GF', ['M'], 15)], description: 'Surface parking next to the plaza entrance.' },
  { owner: 1, name: 'Greenfield Hospital Parking', address: 'Gachibowli, Hyderabad', lat: 17.4401, lng: 78.3489, open: '00:00', close: '23:59', phone: '+914023002100', fee: 0, price: 20, profile: 'flat', demand: 1.2, layout: [car('GF', ['A', 'B'], 20), car('B1', ['C'], 20), bike('GF', ['M'], 10)], description: 'Open 24 hours for patients and visitors. No reservation fee.' },
  { owner: 2, name: 'Apex Tech Park Tower A', address: 'HITEC City, Hyderabad', lat: 17.4474, lng: 78.3762, open: '07:00', close: '22:00', phone: '+914023003100', fee: 10, price: 35, profile: 'office', demand: 1.4, layout: [car('B1', ['A', 'B'], 30), car('GF', ['C'], 40), bike('B1', ['M'], 15)], description: 'Basement and ground parking for Tower A employees and visitors.' },
  { owner: 2, name: 'Apex Tech Park Tower B', address: 'HITEC City, Hyderabad', lat: 17.4489, lng: 78.3781, open: '07:00', close: '22:00', phone: '+914023003200', fee: 10, price: 35, profile: 'office', demand: 1, layout: [car('B1', ['A', 'B'], 35), bike('B1', ['M'], 15)], description: 'Basement parking for Tower B.' },
  { owner: 2, name: 'Apex Overflow Lot', address: 'Madhapur, Hyderabad', lat: 17.4483, lng: 78.3915, open: '08:00', close: '20:00', phone: '+914023003300', fee: 5, price: 25, profile: 'office', demand: 0, active: false, layout: [car('GF', ['A'], 25)], description: 'Closed for resurfacing, hidden from users.' }
];

// Which hours of the day get busy, by the kind of place
const HOURS = {
  office: { 8: 5, 9: 10, 10: 8, 11: 3, 13: 2, 14: 2, 17: 2, 18: 2 },
  retail: { 11: 2, 12: 3, 13: 3, 15: 3, 16: 4, 17: 6, 18: 7, 19: 7, 20: 4 },
  flat: { 8: 3, 9: 4, 10: 5, 11: 5, 12: 4, 14: 4, 15: 4, 16: 4, 17: 3, 18: 2, 20: 1 },
  campus: { 8: 6, 9: 9, 10: 7, 11: 4, 13: 3, 14: 4, 15: 3, 16: 2 }
};
const WEEKEND_FACTOR = { office: 0.2, retail: 1.7, flat: 0.9, campus: 0.35 };

const INCIDENTS = [
  ['Slot Blocked', 'Another vehicle was parked across my reserved slot when I arrived.'],
  ['Payment Issue', 'The amount was deducted twice for one reservation.'],
  ['Payment Issue', 'The gate could not read my payment and I had to wait at the exit.'],
  ['Vehicle Damage', 'Found a scratch on the rear bumper after parking here.'],
  ['Gate Problem', 'The entry barrier did not open after my pass was scanned.'],
  ['Lighting', 'Several lights are out in this section and it is very dark at night.'],
  ['Safety Concern', 'There is water leaking from the ceiling near the ramp.'],
  ['Other Issue', 'The floor signs do not match the slot numbers.']
];
const RESPONSES = ['Checked with the gate team and resolved.', 'Refund processed. Thanks for reporting this.', 'Maintenance has fixed this issue.', 'Reviewed the footage and followed up with you directly.'];

const NOTICES = [
  ['Reservation Payment Confirmed', 'Your Digital QR Pass is ready to use.', 'success'],
  ['Gate Entry Verified', 'Your vehicle entered the parking lot.', 'info'],
  ['Gate Exit Completed', 'Your parking session is complete. Thank you.', 'payment'],
  ['Parking Pass Expired', 'Your parking pass validity has expired and your reservation has been released.', 'warning']
];

const ticketLetters = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const usedTickets = new Set();
const ticketCode = () => {
  let code;
  do {
    code = `WK-${Array.from({ length: 5 }, () => pick(ticketLetters)).join('')}`;
  } while (usedTickets.has(code));
  usedTickets.add(code);
  return code;
};

const usedPlates = new Set();
const plate = () => {
  let value;
  do {
    const [state, district] = pick(STATES);
    const letters = String.fromCharCode(between(65, 90), between(65, 90));
    value = `${state}-${String(district).padStart(2, '0')}-${letters}-${between(1000, 9999)}`;
  } while (usedPlates.has(value));
  usedPlates.add(value);
  return value;
};

let phoneCounter = 0;
const phone = () => {
  phoneCounter += 1;
  return `+9198${String(45000000 + phoneCounter * 137)}`;
};

let referenceCounter = 0;
const reference = (kind) => {
  referenceCounter += 1;
  return `${REF}-${kind}-${referenceCounter}`;
};

const accountEmail = (local) => `${local}@${DOMAIN}`;

// Removes demo data and nothing else. Stops rather than touch a real booking on a demo lot.
const clearDemoData = async (client) => {
  const seedUsers = (await client.query('SELECT id FROM users WHERE email LIKE $1', [`%@${DOMAIN}`])).rows.map((r) => r.id);
  if (seedUsers.length === 0) return false;

  const seedLots = (await client.query('SELECT id FROM parking_lots WHERE admin_id = ANY($1::uuid[])', [seedUsers])).rows.map((r) => r.id);

  const foreign = await client.query(
    `SELECT COUNT(*)::int AS count
     FROM bookings b JOIN parking_slots s ON b.slot_id = s.id
     WHERE s.lot_id = ANY($1::uuid[])
       AND (b.user_id IS NULL OR b.user_id <> ALL($2::uuid[]))
       AND (b.created_by IS NULL OR b.created_by <> ALL($2::uuid[]))`,
    [seedLots, seedUsers]
  );
  if (foreign.rows[0].count > 0) {
    throw new Error(`${foreign.rows[0].count} real booking(s) exist on demo lots. Nothing was changed.`);
  }

  const bookings = (await client.query(
    'SELECT id FROM bookings WHERE user_id = ANY($1::uuid[]) OR created_by = ANY($1::uuid[])',
    [seedUsers]
  )).rows.map((r) => r.id);

  // Slots on real lots go back to free, unless a real booking is using them
  await client.query(
    `UPDATE parking_slots SET status = 'available', updated_at = CURRENT_TIMESTAMP
     WHERE id IN (
       SELECT slot_id FROM bookings
       WHERE id = ANY($1::uuid[]) AND booking_status IN ('pending_payment', 'reserved', 'active', 'parked')
     )
     AND NOT EXISTS (
       SELECT 1 FROM bookings other
       WHERE other.slot_id = parking_slots.id
         AND other.booking_status IN ('pending_payment', 'reserved', 'active', 'parked')
         AND other.id <> ALL($1::uuid[])
     )`,
    [bookings]
  );

  await client.query('DELETE FROM admin_logs WHERE target_id = ANY($1::uuid[])', [bookings]);
  await client.query('DELETE FROM slot_reassignments WHERE booking_id = ANY($1::uuid[]) OR changed_by = ANY($2::uuid[])', [bookings, seedUsers]);
  await client.query('DELETE FROM bookings WHERE id = ANY($1::uuid[])', [bookings]);
  await client.query('DELETE FROM incident_reports WHERE user_id = ANY($1::uuid[])', [seedUsers]);
  await client.query('DELETE FROM payments WHERE booking_id IS NULL AND transaction_reference LIKE $1', [`${REF}-%`]);
  await client.query('DELETE FROM admin_registrations WHERE email LIKE $1', [`%@${DOMAIN}`]);
  await client.query('UPDATE users SET assigned_lot_id = NULL WHERE id = ANY($1::uuid[])', [seedUsers]);
  await client.query('DELETE FROM parking_lots WHERE id = ANY($1::uuid[])', [seedLots]);
  await client.query('DELETE FROM users WHERE id = ANY($1::uuid[])', [seedUsers]);
  return true;
};

const insertUser = async (client, { name, email, passwordHash, role, managedBy = null, lotId = null, organization = null, active = true }) => {
  const id = crypto.randomUUID();
  await client.query(
    `INSERT INTO users (id, full_name, email, password_hash, phone, role, is_verified, managed_by, assigned_lot_id, is_active, organization_name, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, true, $7, $8, $9, $10, $11)`,
    [id, name, email, passwordHash, phone(), role, managedBy, lotId, active, organization, new Date(Date.now() - between(HISTORY_DAYS, HISTORY_DAYS + 60) * DAY)]
  );
  return { id, full_name: name, email };
};

const seedAccounts = async (client, passwordHash) => {
  const bot = await insertUser(client, { name: 'Demo Data', email: accountEmail('seed.bot'), passwordHash, role: 'USER', active: false });

  const owners = [];
  for (const owner of OWNERS) {
    owners.push(await insertUser(client, { name: owner.name, email: accountEmail(owner.email), passwordHash, role: 'ADMIN', organization: owner.organization }));
  }

  const users = [];
  const vehicles = [];
  const names = shuffled(FIRST_NAMES).map((first) => `${first} ${pick(LAST_NAMES)}`);
  for (let i = 0; i < 40; i += 1) {
    const name = names[i];
    const local = i === 0 ? 'user' : `user${i + 1}`;
    const user = await insertUser(client, { name, email: accountEmail(local), passwordHash, role: 'USER' });
    users.push(user);

    const owned = chance(0.3) ? ['four_wheeler', 'two_wheeler'] : [chance(0.75) ? 'four_wheeler' : 'two_wheeler'];
    for (const [index, type] of owned.entries()) {
      const id = crypto.randomUUID();
      const vehicle = { id, user_id: user.id, full_name: name, vehicle_number: plate(), vehicle_type: type };
      await client.query(
        `INSERT INTO vehicles (id, user_id, vehicle_number, vehicle_type, vehicle_model, vehicle_color, is_default)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [id, user.id, vehicle.vehicle_number, type, pick(type === 'four_wheeler' ? CARS : BIKES), pick(COLORS), index === 0]
      );
      vehicles.push(vehicle);
    }
  }
  return { bot, owners, users, vehicles };
};

const seedLots = async (client, owners) => {
  const created = [];
  for (const config of LOTS) {
    const id = crypto.randomUUID();
    const slots = [];
    for (const group of config.layout) {
      for (const section of group.sections) {
        for (let n = 1; n <= 10; n += 1) {
          slots.push({ id: crypto.randomUUID(), slot_number: `${section}${n}`, floor: group.floor, section, slot_type: group.type, hourly_price: group.price, status: 'available' });
        }
      }
    }
    await client.query(
      `INSERT INTO parking_lots (id, name, address, latitude, longitude, total_slots, available_slots, description, admin_id,
                                 opening_time, closing_time, contact_phone, default_hourly_price, supported_vehicle_types, pre_booking_fee, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $6, $7, $8, $9, $10, $11, $12, 'four_wheeler,two_wheeler', $13, $14)`,
      [id, config.name, config.address, config.lat, config.lng, slots.length, config.description, owners[config.owner].id, config.open, config.close, config.phone, config.price, config.fee, config.active !== false]
    );
    for (const slot of slots) {
      await client.query(
        `INSERT INTO parking_slots (id, lot_id, slot_number, slot_type, status, hourly_price, floor, section)
         VALUES ($1, $2, $3, $4, 'available', $5, $6, $7)`,
        [slot.id, id, slot.slot_number, slot.slot_type, slot.hourly_price, slot.floor, slot.section]
      );
    }
    created.push({ id, name: config.name, owner: owners[config.owner], profile: config.profile, demand: config.demand, fee: config.fee, active: config.active !== false, slots });
  }
  return created;
};

const insertBooking = async (client, b) => {
  await client.query(
    `INSERT INTO bookings (id, user_id, vehicle_id, slot_id, booking_type, booking_status, booking_start, booking_end, entry_time, exit_time,
                           duration_minutes, total_amount, payment_status, pre_booking_fee, parking_charge, guest_vehicle_number, guest_phone,
                           created_by, ticket_code, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $20)`,
    [b.id, b.user_id, b.vehicle_id, b.slot_id, b.booking_type, b.booking_status, b.booking_start, b.booking_end, b.entry_time, b.exit_time,
      b.duration_minutes, b.total_amount, b.payment_status, b.pre_booking_fee, b.parking_charge, b.guest_vehicle_number, b.guest_phone,
      b.created_by, b.ticket_code, b.created_at]
  );
};

const insertPayment = (client, bookingId, amount, type, kind, paidAt, method = 'simulated') => client.query(
  `INSERT INTO payments (booking_id, amount, tax, payment_method, payment_status, payment_type, transaction_reference, paid_at)
   VALUES ($1, $2, 0, $3, 'paid', $4, $5, $6)`,
  [bookingId, amount, method, type, reference(kind), paidAt]
);

// A signed pass, so the app and the gate scanner treat it like any other
const insertPass = async (client, booking, slot, lot, vehicle, generatedAt, expiresAt, active) => {
  const { signatureHash } = generateQRPayload(
    booking,
    { id: slot.id, slot_number: slot.slot_number, floor: slot.floor, section: slot.section, hourly_price: slot.hourly_price },
    { id: lot.id, name: lot.name },
    { id: vehicle.user_id, full_name: vehicle.full_name },
    vehicle,
    { expiresAt, issuedAt: generatedAt }
  );
  await client.query(
    `INSERT INTO qr_codes (booking_id, signature_hash, version, is_active, generated_at, expires_at)
     VALUES ($1, $2, 1, $3, $4, $5)`,
    [booking.id, signatureHash, active, generatedAt, expiresAt]
  );
};

const chargeFor = (entry, exit, rate) => {
  const minutes = Math.max(1, Math.ceil((exit - entry) / MINUTE));
  return { minutes, charge: Math.max(1, Math.ceil(minutes / 60)) * Number(rate) };
};

const isFree = (intervals, key, start, end) => !(intervals.get(key) || []).some(([s, e]) => start < e && end > s);
const occupy = (intervals, key, start, end) => intervals.set(key, [...(intervals.get(key) || []), [start, end]]);

const seedHistory = async (client, lots, vehicles, bot, globalFee) => {
  const now = Date.now();
  const slotTimes = new Map();
  const vehicleTimes = new Map();

  // Demo bookings work around real ones, so no slot or vehicle ends up double-booked
  const existing = await client.query(
    `SELECT slot_id, vehicle_id,
            COALESCE(entry_time, booking_start, created_at) AS started,
            COALESCE(exit_time, booking_end, CURRENT_TIMESTAMP) AS ended
     FROM bookings`
  );
  for (const row of existing.rows) {
    const start = new Date(row.started).getTime();
    const end = new Date(row.ended).getTime();
    occupy(slotTimes, row.slot_id, start, end);
    if (row.vehicle_id) occupy(vehicleTimes, row.vehicle_id, start, end);
  }

  const cars = vehicles.filter((v) => v.vehicle_type === 'four_wheeler');
  const bikes = vehicles.filter((v) => v.vehicle_type === 'two_wheeler');
  const history = [];

  for (const lot of lots.filter((l) => l.demand > 0)) {
    const profile = lot.profile;
    for (let daysAgo = HISTORY_DAYS; daysAgo >= 0; daysAgo -= 1) {
      const day = new Date(now - daysAgo * DAY);
      day.setHours(0, 0, 0, 0);
      const weekend = [0, 6].includes(day.getDay());
      const growth = 0.7 + 0.8 * (1 - daysAgo / HISTORY_DAYS); // busier recently, so month-on-month trends show
      const expected = lot.demand * growth * (weekend ? WEEKEND_FACTOR[profile] : 1);
      const count = Math.floor(expected) + (chance(expected % 1) ? 1 : 0);

      for (let i = 0; i < count; i += 1) {
        const start = day.getTime() + weighted(HOURS[profile]) * HOUR + between(0, 59) * MINUTE;
        const minutes = pick([35, 50, 70, 95, 110, 140, 170, 200, 240, 310, 420]) + between(0, 20);
        const end = start + minutes * MINUTE;
        if (end > now - 5 * MINUTE) continue;

        const slot = pick(lot.slots);
        if (!isFree(slotTimes, slot.id, start, end)) continue;
        const pool = slot.slot_type === 'bike' ? bikes : cars;
        const vehicle = pick(pool);
        if (!vehicle || !isFree(vehicleTimes, vehicle.id, start, end)) continue;

        occupy(slotTimes, slot.id, start, end);
        occupy(vehicleTimes, vehicle.id, start, end);
        const fee = lot.fee ?? globalFee;
        const id = crypto.randomUUID();
        const isWalkIn = chance(0.35);
        const noShow = !isWalkIn && chance(0.08);
        const { charge } = chargeFor(start, end, slot.hourly_price);

        if (isWalkIn) {
          const guest = chance(0.55);
          await insertBooking(client, {
            id, user_id: guest ? null : vehicle.user_id, vehicle_id: guest ? null : vehicle.id, slot_id: slot.id,
            booking_type: 'walk_in', booking_status: 'completed', booking_start: new Date(start), booking_end: null,
            entry_time: new Date(start), exit_time: new Date(end), duration_minutes: minutes, total_amount: charge,
            payment_status: 'paid', pre_booking_fee: 0, parking_charge: charge,
            guest_vehicle_number: guest ? plate() : null, guest_phone: guest ? phone() : null,
            created_by: bot.id, ticket_code: ticketCode(), created_at: new Date(start)
          });
          await insertPayment(client, id, charge, 'parking_charge', 'EXIT', new Date(end), pick(['cash', 'upi']));
        } else {
          const bookedAt = start - between(30, 2880) * MINUTE;
          const booked = Math.max(1, Math.ceil(minutes / 60));
          const bookingEnd = start + booked * HOUR;
          const row = {
            id, user_id: vehicle.user_id, vehicle_id: vehicle.id, slot_id: slot.id, booking_type: 'pre_booking',
            booking_status: noShow ? 'expired' : 'completed', booking_start: new Date(start), booking_end: new Date(bookingEnd),
            entry_time: noShow ? null : new Date(start), exit_time: noShow ? null : new Date(end), duration_minutes: noShow ? booked * 60 : minutes,
            total_amount: noShow ? fee : fee + charge, payment_status: 'paid', pre_booking_fee: fee, parking_charge: noShow ? 0 : charge,
            guest_vehicle_number: null, guest_phone: null, created_by: bot.id, ticket_code: null, created_at: new Date(bookedAt)
          };
          await insertBooking(client, row);
          if (fee > 0) await insertPayment(client, id, fee, 'reservation', 'PRE', new Date(bookedAt + MINUTE));
          if (!noShow) await insertPayment(client, id, charge, 'parking_charge', 'EXIT', new Date(end), pick(['cash', 'upi']));
          await insertPass(client, row, slot, lot, vehicle, new Date(bookedAt + MINUTE), new Date(bookingEnd + 2 * HOUR), false);
        }
        history.push({ id, lot, slot, vehicle, walkIn: isWalkIn, noShow, end });
      }
    }
  }
  return { history, slotTimes, vehicleTimes };
};

// What the gate sees right now: parked vehicles, upcoming passes, and a few slots under maintenance
const seedLiveState = async (client, lots, vehicles, bot, slotTimes, vehicleTimes) => {
  const now = Date.now();
  const stats = { parked: 0, reserved: 0, maintenance: 0 };
  const available = shuffled(vehicles);
  const takeVehicle = (type, start, end) => {
    const index = available.findIndex((v) => v.vehicle_type === type && isFree(vehicleTimes, v.id, start, end));
    return index === -1 ? null : available.splice(index, 1)[0];
  };
  const setStatus = (slot, status) => client.query('UPDATE parking_slots SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2', [status, slot.id]);

  for (const lot of lots.filter((l) => l.active)) {
    const free = shuffled(lot.slots.filter((s) => s.status === 'available'));
    const takeSlot = (start, end) => {
      const index = free.findIndex((s) => isFree(slotTimes, s.id, start, end));
      return index === -1 ? null : free.splice(index, 1)[0];
    };
    const fee = Number(lot.fee);

    // Pre-booked vehicles that have arrived
    for (let i = 0; i < 2; i += 1) {
      const entry = now - between(10, 150) * MINUTE;
      const slot = takeSlot(entry, now);
      const vehicle = slot && takeVehicle(slot.slot_type === 'bike' ? 'two_wheeler' : 'four_wheeler', entry, now);
      if (!vehicle) continue;
      const id = crypto.randomUUID();
      const bookedAt = entry - between(60, 600) * MINUTE;
      const bookingEnd = entry + 3 * HOUR;
      const row = {
        id, user_id: vehicle.user_id, vehicle_id: vehicle.id, slot_id: slot.id, booking_type: 'pre_booking', booking_status: 'active',
        booking_start: new Date(entry), booking_end: new Date(bookingEnd), entry_time: new Date(entry), exit_time: null, duration_minutes: 180,
        total_amount: fee, payment_status: 'paid', pre_booking_fee: fee, parking_charge: 0, guest_vehicle_number: null, guest_phone: null,
        created_by: bot.id, ticket_code: null, created_at: new Date(bookedAt)
      };
      await insertBooking(client, row);
      if (fee > 0) await insertPayment(client, id, fee, 'reservation', 'PRE', new Date(bookedAt + MINUTE));
      await insertPass(client, row, slot, lot, vehicle, new Date(bookedAt + MINUTE), new Date(bookingEnd + 2 * HOUR), true);
      await setStatus(slot, 'occupied');
      stats.parked += 1;
    }

    // Reservations still to arrive
    for (let i = 0; i < 2; i += 1) {
      const start = now + between(1, 36) * HOUR;
      const slot = takeSlot(now, now);
      const vehicle = slot && takeVehicle(slot.slot_type === 'bike' ? 'two_wheeler' : 'four_wheeler', now, now);
      if (!vehicle) continue;
      const id = crypto.randomUUID();
      const bookedAt = now - between(5, 240) * MINUTE;
      const bookingEnd = start + 2 * HOUR;
      const row = {
        id, user_id: vehicle.user_id, vehicle_id: vehicle.id, slot_id: slot.id, booking_type: 'pre_booking', booking_status: 'reserved',
        booking_start: new Date(start), booking_end: new Date(bookingEnd), entry_time: null, exit_time: null, duration_minutes: 120,
        total_amount: fee, payment_status: 'paid', pre_booking_fee: fee, parking_charge: 0, guest_vehicle_number: null, guest_phone: null,
        created_by: bot.id, ticket_code: null, created_at: new Date(bookedAt)
      };
      await insertBooking(client, row);
      if (fee > 0) await insertPayment(client, id, fee, 'reservation', 'PRE', new Date(bookedAt + MINUTE));
      await insertPass(client, row, slot, lot, vehicle, new Date(bookedAt + MINUTE), new Date(bookingEnd + 2 * HOUR), true);
      await setStatus(slot, 'reserved');
      stats.reserved += 1;
    }

    // Walk-ins with no account, so the Live Bookings page has work to do
    const walkIns = between(3, 5);
    for (let i = 0; i < walkIns; i += 1) {
      const entry = now - between(5, 200) * MINUTE;
      const slot = takeSlot(entry, now);
      if (!slot) continue;
      await insertBooking(client, {
        id: crypto.randomUUID(), user_id: null, vehicle_id: null, slot_id: slot.id, booking_type: 'walk_in', booking_status: 'active',
        booking_start: new Date(entry), booking_end: null, entry_time: new Date(entry), exit_time: null, duration_minutes: null,
        total_amount: 0, payment_status: 'pending', pre_booking_fee: 0, parking_charge: 0,
        guest_vehicle_number: plate(), guest_phone: phone(), created_by: bot.id, ticket_code: ticketCode(), created_at: new Date(entry)
      });
      await setStatus(slot, 'occupied');
      stats.parked += 1;
    }

    // Only demo lots get maintenance slots; real lots keep their own
    if (lot.seeded) {
      for (let i = 0; i < 2; i += 1) {
        const slot = takeSlot(now, now);
        if (!slot) continue;
        await setStatus(slot, 'maintenance');
        stats.maintenance += 1;
      }
    }
  }
  return stats;
};

const seedExtras = async (client, { lots, history, users, owners, guards, passwordHash }) => {
  const now = Date.now();
  const fee = parseFloat(process.env.ADMIN_REGISTRATION_FEE || '999');

  for (const [index, owner] of owners.entries()) {
    const paidAt = new Date(now - (HISTORY_DAYS + 20 + index) * DAY);
    const txn = reference('REG');
    await client.query(
      `INSERT INTO admin_registrations (full_name, email, password_hash, phone, organization_name, fee_amount, status, payment_method, transaction_reference, user_id, created_at, paid_at)
       VALUES ($1, $2, $3, $4, $5, $6, 'paid', 'card', $7, $8, $9, $9)`,
      [owner.full_name, owner.email, passwordHash, phone(), OWNERS[index].organization, fee, txn, owner.id, paidAt]
    );
    await client.query(
      `INSERT INTO payments (booking_id, amount, tax, payment_method, payment_status, payment_type, transaction_reference, paid_at)
       VALUES (NULL, $1, 0, 'card', 'paid', 'admin_registration', $2, $3)`,
      [fee, txn, paidAt]
    );
  }
  await client.query(
    `INSERT INTO admin_registrations (full_name, email, password_hash, phone, organization_name, fee_amount, status)
     VALUES ('Nikhil Bansal', $1, $2, $3, 'Skyline Residency', $4, 'pending')`,
    [accountEmail('nikhil.bansal'), passwordHash, phone(), fee]
  );

  // Incident reports, a mix of open and solved
  let incidents = 0;
  for (const lot of lots.filter((l) => l.demand > 0)) {
    const count = between(2, 4);
    for (let i = 0; i < count; i += 1) {
      const [type, description] = pick(INCIDENTS);
      const solved = chance(0.55);
      const createdAt = new Date(now - between(1, 75) * DAY);
      await client.query(
        `INSERT INTO incident_reports (user_id, slot_id, lot_id, incident_type, description, status, admin_response, resolved_by, created_at, resolved_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [pick(users).id, pick(lot.slots).id, lot.id, type, description, solved ? 'solved' : 'pending',
          solved ? pick(RESPONSES) : null, solved ? lot.owner.id : null, createdAt, solved ? new Date(createdAt.getTime() + between(2, 72) * HOUR) : null]
      );
      incidents += 1;
    }
  }

  // Past slot moves
  for (const entry of shuffled(history.filter((h) => !h.noShow)).slice(0, 6)) {
    const other = entry.lot.slots.find((s) => s.id !== entry.slot.id && s.slot_type === entry.slot.slot_type);
    if (!other) continue;
    await client.query(
      `INSERT INTO slot_reassignments (booking_id, old_slot_id, new_slot_id, changed_by, reason, changed_at)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [entry.id, other.id, entry.slot.id, entry.lot.owner.id, pick(['Slot blocked by another vehicle', 'Maintenance on the original slot']), new Date(entry.end - HOUR)]
    );
  }

  // Notifications: owners have the bell, users get them too for when they do
  for (const recipient of [...owners, ...users]) {
    const count = between(2, 5);
    for (let i = 0; i < count; i += 1) {
      const [title, message, type] = pick(NOTICES);
      const age = between(0, 20);
      await client.query(
        'INSERT INTO notifications (user_id, title, message, type, is_read, created_at) VALUES ($1, $2, $3, $4, $5, $6)',
        [recipient.id, title, message, type, age > 2, new Date(now - age * DAY - between(0, 600) * MINUTE)]
      );
    }
  }

  // Owner audit trail
  for (const guard of guards) {
    await client.query(
      `INSERT INTO admin_logs (admin_id, action, target_table, target_id, description, created_at)
       VALUES ($1, 'SECURITY_CREATED', 'users', $2, $3, $4)`,
      [guard.owner.id, guard.user.id, `Created security account for ${guard.user.full_name} at ${guard.lot.name}`, new Date(now - between(60, 170) * DAY)]
    );
  }
  return { incidents };
};

const summarise = async (client) => {
  const row = (await client.query(
    `SELECT
       (SELECT COUNT(*)::int FROM users WHERE email LIKE $1) AS users,
       (SELECT COUNT(*)::int FROM vehicles v JOIN users u ON v.user_id = u.id WHERE u.email LIKE $1) AS vehicles,
       (SELECT COUNT(*)::int FROM parking_lots l JOIN users u ON l.admin_id = u.id WHERE u.email LIKE $1) AS lots,
       (SELECT COUNT(*)::int FROM parking_slots s JOIN parking_lots l ON s.lot_id = l.id JOIN users u ON l.admin_id = u.id WHERE u.email LIKE $1) AS slots,
       (SELECT COUNT(*)::int FROM payments WHERE transaction_reference LIKE $2) AS payments`,
    [`%@${DOMAIN}`, `${REF}-%`]
  )).rows[0];
  return row;
};

const run = async () => {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Demo data is not for production.');
  }
  const clearOnly = process.argv.includes('--clear');
  const client = await db.getClient();
  try {
    await client.query('BEGIN');
    const removed = await clearDemoData(client);
    if (clearOnly) {
      await client.query('COMMIT');
      console.log(removed ? '[Seed] Demo data removed.' : '[Seed] No demo data found.');
      return;
    }

    const passwordHash = await bcrypt.hash(PASSWORD, 10);
    const { bot, owners, users, vehicles } = await seedAccounts(client, passwordHash);
    const demoLots = (await seedLots(client, owners)).map((lot) => ({ ...lot, seeded: true }));

    const guards = [];
    for (const [index, lot] of demoLots.entries()) {
      if (!lot.active) continue;
      const user = await insertUser(client, {
        name: `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`,
        email: accountEmail(index === 0 ? 'guard' : `guard${index + 1}`),
        passwordHash,
        role: 'SECURITY',
        managedBy: lot.owner.id,
        lotId: lot.id
      });
      guards.push({ user, lot, owner: lot.owner });
    }

    // Existing lots get history and activity too, so their owner's dashboard fills in. Their prices stay as they are.
    const existing = (await client.query(
      `SELECT l.id, l.name, l.pre_booking_fee, l.admin_id, u.full_name
       FROM parking_lots l LEFT JOIN users u ON l.admin_id = u.id
       WHERE l.is_active = true AND l.id <> ALL($1::uuid[]) AND l.admin_id IS NOT NULL`,
      [demoLots.map((l) => l.id)]
    )).rows;
    const globalFee = Number((await client.query("SELECT value FROM system_settings WHERE key = 'PRE_BOOKING_FEE'")).rows[0]?.value ?? 10);
    const existingLots = [];
    for (const lot of existing) {
      const slots = (await client.query('SELECT id, slot_number, floor, section, slot_type, hourly_price, status FROM parking_slots WHERE lot_id = $1 AND is_active = true', [lot.id])).rows;
      if (slots.length === 0) continue;
      existingLots.push({
        id: lot.id, name: lot.name, owner: { id: lot.admin_id }, profile: 'campus', demand: 1.1,
        fee: lot.pre_booking_fee === null ? globalFee : Number(lot.pre_booking_fee), active: true, seeded: false, slots
      });
    }

    const allLots = [...demoLots, ...existingLots];

    // Existing accounts get some past bookings so Booking History is not empty; they are kept out of the live state
    const realVehicles = (await client.query(
      `SELECT v.id, v.user_id, v.vehicle_number, v.vehicle_type, u.full_name
       FROM vehicles v JOIN users u ON v.user_id = u.id
       WHERE u.email NOT LIKE $1`,
      [`%@${DOMAIN}`]
    )).rows;

    const { history, slotTimes, vehicleTimes } = await seedHistory(client, allLots, [...vehicles, ...realVehicles], bot, globalFee);

    // Users left without a live booking can book straight away when you log in as them
    const liveVehicles = vehicles.filter((v) => users.findIndex((u) => u.id === v.user_id) >= 10);
    const live = await seedLiveState(client, allLots, liveVehicles, bot, slotTimes, vehicleTimes);
    const { incidents } = await seedExtras(client, { lots: allLots, history, users, owners, guards, passwordHash });

    await client.query('COMMIT');

    const totals = await summarise(client);
    console.log('===========================================================');
    console.log('Demo data ready');
    console.log('-----------------------------------------------------------');
    console.log(` Owners ${owners.length}, guards ${guards.length}, users ${users.length}, vehicles ${totals.vehicles}`);
    console.log(` Demo lots ${totals.lots} (${totals.slots} slots), plus ${existingLots.length} existing lots with activity`);
    console.log(` Past bookings ${history.length} over ${HISTORY_DAYS} days, payments ${totals.payments}`);
    console.log(` Live now: ${live.parked} parked, ${live.reserved} reserved, ${live.maintenance} under maintenance`);
    console.log(` Incident reports ${incidents}`);
    console.log('-----------------------------------------------------------');
    console.log(` Password for every demo account: ${PASSWORD}`);
    console.log(` Owners: ${owners.map((o) => o.email).join(', ')}`);
    console.log(` Guard:  ${accountEmail('guard')} (${demoLots[0].name})`);
    console.log(` User:   ${accountEmail('user')} (free to book), through user40`);
    console.log('===========================================================');
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    client.release();
  }
};

run()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('[Seed] Failed:', err.message);
    process.exit(1);
  });
