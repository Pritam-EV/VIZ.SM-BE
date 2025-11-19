/**
 * Gets new date with added months in provided date
 * @param date - base date for reference
 * @param months - Integer value to add in the months of provided date
 */
export function addMonths(date: Date, months: number): Date {
    const newDate = new Date(date);
    newDate.setMonth(date.getMonth() + months);

    return newDate;
}