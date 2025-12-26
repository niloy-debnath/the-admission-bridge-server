import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import pkg from "pg";

dotenv.config();
const { Pool } = pkg;

const app = express();
app.use(cors());
app.use(express.json());

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// Get all Universities
app.get("/universities", async (req, res) => {
  try {
    const { minFee, maxFee, gpa, ielts, country, degree } = req.query;

    const minFeeNum = minFee ? Number(minFee) : 0;
    const maxFeeNum = maxFee ? Number(maxFee) : 100000;

    let query = `
      SELECT *
      FROM universities
      WHERE tuition_fee BETWEEN $1 AND $2
    `;

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

    res.json(universities);
  } catch (error) {
    console.error("DB ERROR:", error.message);
    res.status(500).json({ message: "Database error" });
  }
});

app.get("/test-db", async (req, res) => {
  const result = await pool.query("SELECT NOW()");
  res.json(result.rows);
});

export default app;
// app.listen(5000, () => console.log("Server running on http://localhost:5000"));
