import prisma from './prisma';

// simple query wrapper compatible with code expecting `query(sql, params)` that returns rows
export async function query(sql, params) {
  // prisma.$queryRawUnsafe accepts raw SQL with template params
  try {
    if (!params || !Array.isArray(params) || params.length === 0) {
      const rows = await prisma.$queryRawUnsafe(sql);
      return rows;
    }
    // spread params
    const rows = await prisma.$queryRawUnsafe(sql, ...params);
    return rows;
  } catch (e) {
    throw e;
  }
}
