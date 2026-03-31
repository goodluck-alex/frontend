export const getCountryPrefix = (countryCode) => {
  const prefixes = { UG: "+256", KE: "+254", US: "+1" };
  return prefixes[countryCode] || "+000";
};

// Example: getCountryPrefix('KE') => "+254"