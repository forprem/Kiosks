export function addOneYear(startDate: Date): Date {
  const endDate = new Date(startDate);
  endDate.setFullYear(endDate.getFullYear() + 1);
  return endDate;
}

export function isExactlyOneYearRange(startDate: Date, endDate: Date): boolean {
  const oneYearLater = addOneYear(startDate);
  return oneYearLater.getTime() === endDate.getTime();
}

export function hasDateOverlap(
  startA: Date,
  endA: Date,
  startB: Date,
  endB: Date
): boolean {
  return startA < endB && startB < endA;
}
