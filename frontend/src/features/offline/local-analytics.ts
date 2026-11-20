import { missingKind } from '@dashboard/data-core';
import { projectStore, type LocalProject } from './project-store';

export function summarizeLocalProjects(projects: readonly LocalProject[]) {
  let rows = 0, versions = 0, operations = 0, cells = 0, missing = 0;
  const types = new Map<string, number>();
  for (const project of projects) {
    const { columns, rows: records } = project.snapshot;
    rows += records.length;
    versions += 1 + project.operations.length;
    operations += project.operations.filter(operation => operation.kind === 'process').length;
    cells += records.length * columns.length;
    for (const column of columns) {
      types.set(column.logicalType, (types.get(column.logicalType) ?? 0) + 1);
      for (const record of records) {
        const cell = record.cells[column.columnId];
        if (cell === undefined || missingKind(cell) !== undefined) missing++;
      }
    }
  }
  return {
    projects: projects.length, rows, versions, operations, cells, missing,
    types: [...types].sort(([a], [b]) => a.localeCompare(b)),
  };
}

export async function readLocalAnalytics(ownerId?: string) {
  const projects = await projectStore.list();
  return summarizeLocalProjects(projects.filter(project => !project.accountId || project.accountId === ownerId));
}

export type LocalAnalytics = ReturnType<typeof summarizeLocalProjects>;
