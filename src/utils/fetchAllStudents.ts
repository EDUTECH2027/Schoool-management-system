/*
 * Copyright (c) 2026 [COMPANY LEGAL NAME]. All rights reserved.
 * Proprietary and confidential. Unauthorized copying, distribution or
 * modification of this file, via any medium, is strictly prohibited.
 */
import { api } from '../api/client';

// GET /students returns only 100 rows by default (sorted by first name), which silently hid
// students from larger schools. Walk every page (the API caps a page at 500).
export async function fetchAllStudents() {
  const limit = 500;
  const first = await api.getStudentsPage({ limit: String(limit), page: '1' });
  const rows = [...first.data];
  for (let page = 2; rows.length < first.total; page++) {
    const next = await api.getStudentsPage({ limit: String(limit), page: String(page) });
    if (next.data.length === 0) break;
    rows.push(...next.data);
  }
  return rows;
}
