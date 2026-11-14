// Theo sheet quy ước; áp dụng tại validator/engine khi triển khai nghiệp vụ.
export const RESOURCE_LIMITS = Object.freeze({
  csvBytes: 16_000_000,
  chunkBytes: 4 * 1024 * 1024,
  jsonBodyBytes: 1024 * 1024,
  encodedSnapshotBytes: 100 * 1024 * 1024,
  columns: 1000,
  ordinalCategories: 5000,
  oneHotCategoriesPerColumn: 100,
  maxPageSize: 100,
  previewTtlMs: 30 * 60 * 1000,
});
