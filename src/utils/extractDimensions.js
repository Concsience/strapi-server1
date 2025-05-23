function extractDimensions(physicalDimensions) {
    // Initialize result object
    const result = {
        width: null,
        height: null,
        unit: 'cm'
    };

    // Handle cases where dimensions might be null or undefined
    if (!physicalDimensions) {
        return result;
    }

    // Conversion factors to centimeters
    const conversions = {
        'in': 2.54,    // inches to cm
        'cm': 1,       // already in cm
        'ft': 30.48,   // feet to cm
        'm': 100       // meters to cm
    };

    // Function to convert fraction or decimal to number
    function parseMeasurement(value) {
        if (!value) return null;
        // Handle fractions like "39 3/8"
        if (value.includes('/')) {
            const parts = value.split(' ');
            if (parts.length === 2) {
                const [whole, fraction] = parts;
                const [num, denom] = fraction.split('/').map(Number);
                return Number(whole) + (num / denom);
            }
        }
        // Handle decimals like "72.8"
        return Number(value);
    }

    // Regular expression to match various dimension formats:
    // "39 3/8 x 31 in. (100.01 x 78.74 cm)" - dual units
    // "72.8cm X 89.2cm" - simple cm
    // "w128 x h165 cm" - prefixed cm
    // "99.5 ft high" - height only
    // "84.1 × 152.4 cm (33 1/8 × 60 in.)" - dual units with unicode ×
    // "w1892 x h1092 cm (Without frame)" - large cm values
    const regex = /(?:(?:w|width)?\s*([\d\s\/\.]+)\s*(?:x|h|height|×)?\s*([\d\s\/\.]+)?\s*(in\.?|cm|ft|m)?(?:\s*\(([\d\s\/\.]+)\s*(?:x|×)\s*([\d\s\/\.]+)\s*(in\.?|cm|ft|m)\))?)|(?:([\d\s\/\.]+)\s*(ft|in\.?|cm|m)\s*high)/i;

    const match = physicalDimensions.match(regex);

    if (match) {
        let width, height, unit;

        // Handle height-only format (e.g., "99.5 ft high")
        if (match[7] && match[8]) {
            height = parseMeasurement(match[7]);
            unit = match[8].toLowerCase();
            if (height && conversions[unit]) {
                result.height = height * conversions[unit];
            }
        }
        // Handle standard width x height format
        else {
            // Check if dual units are provided (e.g., cm and in.)
            if (match[4] && match[5] && match[6] === 'cm') {
                // Prefer cm values in parentheses
                width = parseMeasurement(match[4]);
                height = parseMeasurement(match[5]);
                unit = 'cm';
            } else {
                // Use primary dimensions
                width = parseMeasurement(match[1]);
                height = parseMeasurement(match[2]);
                unit = match[3] ? match[3].toLowerCase() : null;
            }

            if (width && conversions[unit]) {
                result.width = width * conversions[unit];
            }
            if (height && conversions[unit]) {
                result.height = height * conversions[unit];
            }
        }
    }

    // Round to 2 decimal places for consistency
    if (result.width) result.width = Number(result.width.toFixed(2));
    if (result.height) result.height = Number(result.height.toFixed(2));

    return result;
}

module.exports = extractDimensions; 