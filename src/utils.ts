/**
 * Replaces date placeholders (%Y, %m, etc) with their appropriate values (2021, 01, etc)
 * @param value - The string to replace placeholders in
 */
export const replaceDatePlaceholdersWithValues = (value: string) => {
	const now = new Date();
	if (value.includes("%Y")) {
		value = value.replace(/%Y/g, now.getFullYear().toString());
	}

	if (value.includes("%m")) {
		value = value.replace(
			/%m/g,
			(now.getMonth() + 1).toString().padStart(2, "0")
		);
	}

	if (value.includes("%d")) {
		value = value.replace(/%d/g, now.getDate().toString().padStart(2, "0"));
	}

	if (value.includes("%H")) {
		value = value.replace(
			/%H/g,
			now.getHours().toString().padStart(2, "0")
		);
	}

	if (value.includes("%M")) {
		value = value.replace(
			/%M/g,
			now.getMinutes().toString().padStart(2, "0")
		);
	}

	if (value.includes("%S")) {
		value = value.replace(
			/%S/g,
			now.getSeconds().toString().padStart(2, "0")
		);
	}

	return value;
};

/**
 * Gets the date placeholders for ISO8604 format (YYYY-MM-DDTHH:MM:SS)
 * We return underscores instead of dashes to separate the date and time
 * @returns Returns iso date placeholders
 */
export const getDatePlaceholdersForISO = (includeTime: boolean) => {
	if (includeTime) {
		return "%Y_%m_%d-%H_%M_%S";
	}
	return "%Y_%m_%d";
};
