// Which vehicles a lot takes and which bays a vehicle may use.
// A lot lists the vehicle types it accepts (parking_lots.supported_vehicle_types, comma separated);
// each bay is either a car bay or a bike bay (parking_slots.slot_type).

export const VEHICLE_TYPES = ['four_wheeler', 'two_wheeler'];

export const SLOT_TYPE_FOR_VEHICLE = { four_wheeler: 'car', two_wheeler: 'bike' };
export const VEHICLE_FOR_SLOT_TYPE = { car: 'four_wheeler', bike: 'two_wheeler' };

const PLURAL = { four_wheeler: 'cars', two_wheeler: 'bikes' };
const BAY = { car: 'a car bay', bike: 'a bike bay' };

export const parseSupportedTypes = (value) =>
  String(value || '').split(',').map((s) => s.trim()).filter((s) => VEHICLE_TYPES.includes(s));

export const lotSupports = (lot, vehicleType) => parseSupportedTypes(lot.supported_vehicle_types).includes(vehicleType);

/**
 * Normalises a supported_vehicle_types value from a request.
 * Returns { value } with a clean comma list, { value: null } when absent, or { error } when invalid.
 */
export const normaliseSupportedTypes = (raw) => {
  if (raw === undefined || raw === null || raw === '') return { value: null };
  const list = Array.isArray(raw) ? raw : String(raw).split(',');
  const types = VEHICLE_TYPES.filter((t) => list.map((x) => String(x).trim()).includes(t));
  if (types.length === 0) return { error: 'A lot must accept cars, bikes, or both.' };
  return { value: types.join(',') };
};

/** Why this vehicle can't use this bay in this lot, or null when it can. */
export const bayMismatchReason = ({ lot, slot, vehicle }) => {
  const type = vehicle.vehicle_type || 'four_wheeler';
  if (!lotSupports(lot, type)) {
    return `${lot.name} doesn't take ${PLURAL[type]}. Pick a lot that accepts your vehicle.`;
  }
  const needed = SLOT_TYPE_FOR_VEHICLE[type];
  if ((slot.slot_type || 'car') !== needed) {
    return `Slot ${slot.slot_number} is ${BAY[slot.slot_type] || 'a different kind of bay'}. Your ${type === 'two_wheeler' ? 'bike' : 'car'} needs ${BAY[needed]}.`;
  }
  return null;
};

/** Why a lot can't hold bays of this type, or null when it can. */
export const slotTypeMismatchReason = (lot, slotType) => {
  const vehicleType = VEHICLE_FOR_SLOT_TYPE[slotType];
  if (!vehicleType) return 'Slot type must be car or bike.';
  if (!lotSupports(lot, vehicleType)) {
    return `${lot.name} doesn't accept ${PLURAL[vehicleType]}, so it can't have ${slotType} bays. Update the lot's vehicle types first.`;
  }
  return null;
};
