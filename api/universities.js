import { Pool } from "pg";
import dotenv from "dotenv";

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).end();

  try {
    const { minFee, maxFee, gpa, ielts, country, degree } = req.query;

    const minFeeNum = minFee ? Number(minFee) : 0;
    const maxFeeNum = maxFee ? Number(maxFee) : 100000;

    let query = `SELECT * FROM universities WHERE tuition_fee BETWEEN $1 AND $2`;
    const values = [minFeeNum, maxFeeNum];
    let idx = 3;

    if (country && country.trim() !== "") {
      query += ` AND LOWER(country) LIKE LOWER($${idx})`;
      values.push(`%${country}%`);
      idx++;
    }

    if (degree && degree.trim() !== "") {
      query += ` AND LOWER(degree_level) LIKE LOWER($${idx})`;
      values.push(`%${degree}%`);
      idx++;
    }

    const result = await pool.query(query, values);

    const universities = result.rows.map((u) => ({
      ...u,
      eligible:
        (!gpa || Number(gpa) >= u.min_gpa) &&
        (!ielts || Number(ielts) >= u.min_ielts),
    }));

    res.status(200).json(universities);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: "Database error" });
  }
}
