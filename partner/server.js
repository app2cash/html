const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const { createClient } = require("@supabase/supabase-js");

const app = express();
app.use(cors());
app.use(bodyParser.json());

// SUPABASE
const supabase = createClient(
  "https://vpeqbsctlysjkuceejxp.supabase.co",
  "YOUR_SERVICE_ROLE_KEY"
);

// создать лид (главная функция)
app.post("/lead", async (req, res) => {
  const { name, phone, amount, partner_code } = req.body;

  const { data, error } = await supabase
    .from("leads")
    .insert([
      {
        name,
        phone,
        amount,
        partner_code,
        status: "new"
      }
    ]);

  res.json({ data, error });
});

app.listen(3000, () => {
  console.log("Server running on 3000");
});