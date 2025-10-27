// Name Validation (allows letters, spaces, hyphens, apostrophes)
const nameRegex = /^[a-zA-Z-' ]+$/;
if (!lastName.trim()) {
    newErrors.lastName = "Last Name is required.";
} else if (!nameRegex.test(lastName)) {
    newErrors.lastName = "Last Name contains invalid characters.";
}

if (!firstName.trim()) {
    newErrors.firstName = "First Name is required.";
} else if (!nameRegex.test(firstName)) {
    newErrors.firstName = "First Name contains invalid characters.";
}

// Middle Initial Validation (optional, but if present, must be one letter)
if (middleInitial.trim() && !/^[A-Z]$/i.test(middleInitial)) {
    newErrors.middleInitial = "M.I. must be a single letter.";
}