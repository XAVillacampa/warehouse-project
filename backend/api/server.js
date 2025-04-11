const express = require("express");
const mysql = require("mysql2/promise");
const cors = require("cors");
const dotenv = require("dotenv");
const bcrypt = require("bcrypt");
const { verifyToken, generateToken, decodeToken } = require("./authUsers");

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

const allowedOrigins = [
  "http://localhost:5173", // Local development
  "https://warehouse-project-seven.vercel.app", // Deployed frontend
  "https://warehouse-project.onrender.com", // Deployed backend
];

// Validate environment variables
if (
  !process.env.DB_HOST ||
  !process.env.DB_USER ||
  !process.env.DB_PASSWORD ||
  !process.env.DB_NAME ||
  !process.env.DB_PORT
) {
  console.error(
    "Missing required environment variables for database connection."
  );
  process.exit(1);
}

app.use(express.json());
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        console.error(`CORS error: Origin ${origin} not allowed`);
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true, // Allow cookies and credentials
  })
);

// Create MySQL connection pool
const db = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// Test the database connection
db.getConnection((err, connection) => {
  if (err) {
    console.error("Database connection failed:", err);
    return;
  }
  console.log("Connected to MySQL database.");
  connection.release(); // Release the connection back to the pool
});

// Function to format a Date object to 'YYYY-MM-DD'
function formatDateForMySQL(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

app.get("/health", (req, res) => {
  res.status(200).send("OK");
});

// Connect to MySQL database
// db.connect((err) => {
//   if (err) {
//     console.error("Error connecting to MySQL: ", err);
//     return;
//   }
//   console.log("Connected to MySQL database!");
// });

// ------------------- PRODUCTS CRUD -------------------

// Get all products
app.get("/api/inventory", async (req, res) => {
  try {
    const [results] = await db.execute("SELECT * FROM Inventory;");
    // console.log("Fetched Products: ", results);
    res.json(results);
  } catch (err) {
    console.error("Error fetching products:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Add a new product
app.post("/api/inventory", async (req, res) => {
  let {
    product_name,
    sku,
    warehouse_code,
    stock_check,
    outbound,
    weight,
    height,
    length,
    width,
    cbm,
    vendor_number,
  } = req.body;

  try {
    // Ensure required fields are set to NULL if undefined
    product_name = product_name ?? null;
    sku = sku ?? null;
    warehouse_code = warehouse_code ?? null;
    stock_check = stock_check ?? 0; // Default to 0 if undefined
    outbound = outbound ?? 0; // Default to 0 if undefined
    weight = weight ?? 0;
    height = height ?? 0;
    length = length ?? 0;
    width = width ?? 0;
    cbm = cbm ?? 0;
    vendor_number = vendor_number ?? null;

    // Ensure SKU is not NULL
    if (!sku) {
      return res
        .status(400)
        .json({ success: false, message: "SKU is required" });
    }

    // 🔍 Check if SKU already exists
    const [existing] = await db.execute(
      "SELECT sku FROM Inventory WHERE sku = ?",
      [sku]
    );
    if (existing.length > 0) {
      return res
        .status(400)
        .json({ success: false, message: "SKU already exists" });
    }

    // Insert into the database
    await db.execute(
      `INSERT INTO Inventory 
      (product_name, sku, warehouse_code, stock_check, outbound, weight, height, length, width, cbm, vendor_number, created_at, updated_at)  
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [
        product_name,
        sku,
        warehouse_code,
        stock_check,
        outbound,
        weight,
        height,
        length,
        width,
        cbm,
        vendor_number,
      ]
    );

    res
      .status(201)
      .json({ success: true, message: "Product added successfully!" });
  } catch (err) {
    console.error("Error adding product:", err);
    res.status(500).json({ success: false, error: "Internal Server Error" });
  }
});

// Update a product
app.put("/api/inventory/:sku", async (req, res) => {
  const { sku } = req.params;
  let {
    product_name,
    warehouse_code,
    stock_check,
    outbound,
    weight,
    height,
    length,
    width,
    cbm,
    vendor_number,
  } = req.body;

  try {
    console.log("Updating product - Incoming data:", req.body); // Debugging

    // Ensure all fields are set to valid values
    product_name = product_name ?? null;
    warehouse_code = warehouse_code ?? null;
    stock_check = stock_check ?? 0;
    outbound = outbound ?? 0;
    weight = weight ?? 0;
    height = height ?? 0;
    length = length ?? 0;
    width = width ?? 0;
    cbm = cbm ?? 0;
    vendor_number = vendor_number ?? null;

    // Check if product exists before updating
    const [existing] = await db.execute(
      "SELECT sku FROM Inventory WHERE sku = ?",
      [sku]
    );
    if (existing.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Product not found" });
    }

    // Correct the SQL query
    await db.execute(
      `UPDATE Inventory 
      SET product_name = ?, warehouse_code = ?, stock_check = ?, outbound = ?, 
      weight = ?, height = ?, length = ?, width = ?, cbm = ?, vendor_number = ?, 
      updated_at = NOW() 
      WHERE sku = ?`,
      [
        product_name,
        warehouse_code,
        stock_check,
        outbound,
        weight,
        height,
        length,
        width,
        cbm,
        vendor_number,
        sku, // Correct position of SKU in WHERE clause
      ]
    );

    res.json({ success: true, message: "Product updated successfully!" });
  } catch (err) {
    console.error("Error updating product:", err);
    res.status(500).json({ success: false, error: "Internal Server Error" });
  }
});

// Delete a product
app.delete("/api/inventory/:sku", async (req, res) => {
  const { sku } = req.params;
  try {
    const [existing] = await db.execute(
      "SELECT sku FROM Inventory WHERE sku = ?",
      [sku]
    );
    if (existing.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Product not found" });
    }

    await db.execute("DELETE FROM Inventory WHERE sku = ?", [sku]);
    res.json({ message: "Product deleted successfully" });
  } catch (err) {
    console.error("Error deleting product:", err);
    res.status(500).json({ success: false, error: "Internal Server Error" });
  }
});

/* ------------------- NEWS ANNOUNCEMENT CRUD ------------------- */
// Get all news
app.get("/api/news", async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT 
        id, 
        title, 
        content, 
        priority, 
        created_by AS createdBy, 
        DATE_FORMAT(created_at, '%Y-%m-%dT%H:%i:%sZ') AS createdAt, 
        DATE_FORMAT(updated_at, '%Y-%m-%dT%H:%i:%sZ') AS updatedAt 
      FROM news_notifications 
      ORDER BY created_at DESC`
    );
    res.json(rows);
  } catch (err) {
    console.error("Error fetching news:", err);
    res.status(500).json({ error: "Failed to fetch news" });
  }
});

// Add a new news
app.post("/api/news", verifyToken, async (req, res) => {
  const { id, title, content, priority } = req.body;

  // Extract the username from the authenticated user (from the token)
  const created_by = req.user?.username || "System";

  if (!id || !title || !content || !priority) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    await db.query(
      "INSERT INTO news_notifications (id, title, content, priority, created_by, created_at) VALUES (?, ?, ?, ?, ?, NOW())",
      [id, title, content, priority, created_by]
    );
    res.status(201).json({ message: "News added successfully" });
  } catch (err) {
    console.error("Error adding news:", err);
    res.status(500).json({ error: "Failed to add news" });
  }
});

// Update a news
app.put("/api/news/:id", async (req, res) => {
  const { id } = req.params;
  const { title, content, priority } = req.body;
  try {
    await db.query(
      "UPDATE news_notifications SET title = ?, content = ?, priority = ?, updated_at = NOW() WHERE id = ?",
      [title, content, priority, id]
    );
    res.json({ message: "News updated successfully" });
  } catch (err) {
    console.error("Error updating news:", err);
    res.status(500).json({ error: "Failed to update news" });
  }
});

// Delete a news
app.delete("/api/news/:id", async (req, res) => {
  const { id } = req.params;
  try {
    await db.query("DELETE FROM news_notifications WHERE id = ?", [id]);
    res.json({ message: "News deleted successfully" });
  } catch (err) {
    console.error("Error deleting news:", err);
    res.status(500).json({ error: "Failed to delete news" });
  }
});

/* ------------------- INBOUND SHIPMENTS CRUD ------------------- */

// Get all inbound shipments
app.get("/api/inbound-shipments", async (req, res) => {
  try {
    const [results] = await db.execute("SELECT * FROM Inbound_Shipments;");
    res.json(results);
  } catch (err) {
    console.error("Error fetching inbound shipments:", err);
    res.status(500).json({ success: false, error: "Internal Server Error" });
  }
});

// Add a new inbound shipment
app.post("/api/inbound-shipments", async (req, res) => {
  const {
    shipping_date,
    box_label,
    sku,
    warehouse_code,
    item_quantity,
    arriving_date,
    tracking_number,
    vendor_number,
  } = req.body;

  try {
    // Ensure required fields are provided
    if (
      !shipping_date ||
      !box_label ||
      !sku ||
      !warehouse_code ||
      !item_quantity ||
      !arriving_date ||
      !tracking_number ||
      !vendor_number
    ) {
      console.error("Missing required fields:", req.body);
      return res
        .status(400)
        .json({ success: false, error: "Missing required fields" });
    }

    // Start a transaction
    const connection = await db.getConnection();
    await connection.beginTransaction();

    try {
      // Check if the SKU exists in the inventory table
      const [inventory] = await connection.execute(
        "SELECT sku FROM Inventory WHERE sku = ?",
        [sku]
      );

      if (inventory.length === 0) {
        console.error("SKU not found in inventory:", sku);
        await connection.rollback();
        connection.release();
        return res
          .status(404)
          .json({ success: false, error: "SKU not found in inventory" });
      }

      // Check if the warehouse_code exists in the inventory table
      const [warehouse] = await connection.execute(
        "SELECT warehouse_code FROM Inventory WHERE warehouse_code = ?",
        [warehouse_code]
      );

      if (warehouse.length === 0) {
        console.error("Warehouse code not found in inventory:", warehouse_code);
        await connection.rollback();
        connection.release();
        return res.status(404).json({
          success: false,
          error: "Warehouse code not found in inventory",
        });
      }

      // Insert inbound shipment
      await connection.execute(
        `INSERT INTO Inbound_Shipments 
        (shipping_date, box_label, sku, warehouse_code, item_quantity, arriving_date, tracking_number, vendor_number) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          shipping_date,
          box_label,
          sku,
          warehouse_code,
          item_quantity,
          arriving_date,
          tracking_number,
          vendor_number,
        ]
      );

      // Update inventory stock
      await connection.execute(
        `UPDATE Inventory 
        SET stock_check = stock_check + ? 
        WHERE sku = ?`,
        [item_quantity, sku]
      );

      // Commit transaction
      await connection.commit();
      connection.release();

      res.status(201).json({
        success: true,
        message: "Inbound shipment added successfully!",
      });
    } catch (err) {
      console.error("Error during transaction:", err);
      await connection.rollback();
      connection.release();
      throw err;
    }
  } catch (err) {
    console.error("Error adding inbound shipment:", err);
    res.status(500).json({ success: false, error: "Internal Server Error" });
  }
});

// Bulk upload inbound shipments
app.post("/api/inbound-shipments/bulk", async (req, res) => {
  const shipments = req.body;

  // Log the received shipments for debugging
  console.log("Received shipments:", shipments);

  if (!Array.isArray(shipments)) {
    return res
      .status(400)
      .json({ success: false, error: "Invalid data format" });
  }

  const maxRetries = 3;
  let attempt = 0;

  while (attempt < maxRetries) {
    try {
      const connection = await db.getConnection();
      await connection.beginTransaction();

      for (const shipment of shipments) {
        const {
          shipping_date,
          box_label,
          sku,
          warehouse_code,
          item_quantity,
          arriving_date,
          tracking_number,
          vendor_number,
        } = shipment;

        // Ensure all required fields are provided
        if (
          !shipping_date ||
          !box_label ||
          !sku ||
          !warehouse_code ||
          !item_quantity ||
          !arriving_date ||
          !tracking_number ||
          !vendor_number
        ) {
          console.error("Missing required fields in shipment:", shipment);
          await connection.rollback();
          connection.release();
          return res
            .status(400)
            .json({ success: false, error: "Missing required fields" });
        }

        // Check if the SKU exists in the inventory table
        const [inventory] = await connection.execute(
          "SELECT sku FROM Inventory WHERE sku = ?",
          [sku]
        );

        if (inventory.length === 0) {
          console.error("SKU not found in inventory:", sku);
          await connection.rollback();
          connection.release();
          return res
            .status(404)
            .json({ success: false, error: "SKU not found in inventory" });
        }

        // Check if the warehouse_code exists in the inventory table
        const [warehouse] = await connection.execute(
          "SELECT warehouse_code FROM Inventory WHERE warehouse_code = ?",
          [warehouse_code]
        );

        if (warehouse.length === 0) {
          console.error(
            "Warehouse code not found in inventory:",
            warehouse_code
          );
          await connection.rollback();
          connection.release();
          return res.status(404).json({
            success: false,
            error: "Warehouse code not found in inventory",
          });
        }

        // Insert inbound shipment
        await connection.execute(
          `INSERT INTO Inbound_Shipments
          (shipping_date, box_label, sku, warehouse_code, item_quantity, arriving_date, tracking_number, vendor_number) 
          VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
          [
            shipping_date,
            box_label,
            sku,
            warehouse_code,
            item_quantity,
            arriving_date,
            tracking_number,
            vendor_number,
          ]
        );

        // Update inventory stock
        await connection.execute(
          `UPDATE Inventory 
          SET stock_check = stock_check + ? 
          WHERE sku = ?;`,
          [item_quantity, sku]
        );
      }

      // Commit the transaction
      await connection.commit();
      connection.release();

      res.status(201).json({
        success: true,
        message: "Inbound shipments added successfully!",
      });
      return;
    } catch (err) {
      if (err.code === "ER_LOCK_WAIT_TIMEOUT") {
        attempt++;
        console.error(
          `Lock wait timeout exceeded, retrying (${attempt}/${maxRetries})...`
        );
        if (attempt >= maxRetries) {
          console.error(
            "Max retries reached. Could not complete the transaction."
          );
          return res
            .status(500)
            .json({ success: false, error: "Internal Server Error" });
        }
      } else {
        console.error("Error adding inbound shipments:", err);
        return res
          .status(500)
          .json({ success: false, error: "Internal Server Error" });
      }
    }
  }
});

// Update an inbound shipment
app.put("/api/inbound-shipments/:id", async (req, res) => {
  const { id } = req.params;
  const {
    shipping_date,
    box_label,
    sku,
    warehouse_code,
    item_quantity,
    arriving_date,
    tracking_number,
    vendor_number,
  } = req.body;

  try {
    // Ensure all required fields are provided
    if (
      !shipping_date ||
      !box_label ||
      !sku ||
      !warehouse_code ||
      !item_quantity ||
      !arriving_date ||
      !tracking_number ||
      !vendor_number
    ) {
      console.error("Missing required fields:", req.body);
      return res
        .status(400)
        .json({ success: false, error: "Missing required fields" });
    }

    // Check if the shipment exists
    const [existing] = await db.execute(
      "SELECT * FROM Inbound_Shipments WHERE id = ?",
      [id]
    );

    if (existing.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Inbound shipment not found" });
    }

    const oldQuantity = existing[0].item_quantity;

    // Check if the SKU exists in inventory
    const [inventory] = await db.execute(
      "SELECT stock_check FROM Inventory WHERE sku = ?",
      [sku]
    );

    if (inventory.length === 0) {
      return res
        .status(404)
        .json({ success: false, error: "SKU not found in inventory" });
    }

    const stock_check = inventory[0].stock_check;

    // Adjust inventory stock if quantity has changed
    const quantityDifference = item_quantity - oldQuantity;

    if (quantityDifference !== 0) {
      await db.execute(
        `UPDATE Inventory 
        SET stock_check = stock_check + ? 
        WHERE sku = ?`,
        [quantityDifference, sku]
      );
    }

    // Update the shipment record
    await db.execute(
      `UPDATE Inbound_Shipments 
      SET shipping_date = ?, box_label = ?, sku = ?, warehouse_code = ?, item_quantity = ?, 
      arriving_date = ?, tracking_number = ?, vendor_number = ?
      WHERE id = ?`,
      [
        shipping_date,
        box_label,
        sku,
        warehouse_code,
        item_quantity,
        arriving_date,
        tracking_number,
        vendor_number,
        id,
      ]
    );

    res.json({
      success: true,
      message: "Inbound shipment updated successfully!",
    });
  } catch (err) {
    console.error("Error updating inbound shipment:", err);
    res.status(500).json({ success: false, error: "Internal Server Error" });
  }
});

// Delete an inbound shipment
app.delete("/api/inbound-shipments/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const [existing] = await db.query(
      "SELECT id, sku, item_quantity FROM Inbound_Shipments WHERE id = ?",
      [id]
    );

    // Check if the shipment exists
    if (existing[0].length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Inbound shipment not found" });
    }

    // Get the SKU and quantity
    const { sku, item_quantity } = existing[0];

    // Start a transaction
    const connection = await db.getConnection();
    if (!connection) {
      return res
        .status(500)
        .json({ success: false, message: "Database connection failed" });
    }

    await connection.beginTransaction();

    try {
      await connection.execute("DELETE FROM Inbound_Shipments WHERE id = ?", [
        id,
      ]);
      await connection.execute(
        `UPDATE Inventory
        SET stock_check = stock_check - ?
        WHERE sku = ?`,
        [item_quantity, sku]
      );

      await connection.commit();
      connection.release();

      res.json({
        success: true,
        message: "Inbound shipment deleted successfully!",
      });
    } catch (err) {
      await connection.rollback();
      connection.release();
      throw err;
    }
  } catch (err) {
    console.error("Error deleting inbound shipment:", err);
    res.status(500).json({ success: false, error: "Internal Server Error" });
  }
});

/* ------------------- OUTBOUND SHIPMENTS CRUD ------------------- */

// Get all outbound shipments
app.get("/api/outbound-shipments", async (req, res) => {
  try {
    const [results] = await db.execute("SELECT * FROM Outbound_Shipments;");
    res.json(results);
  } catch (err) {
    console.error("Error fetching outbound shipments:", err);
    res.status(500).json({ success: false, error: "Internal Server Error" });
  }
});

// Function to get and increment the order ID counter
const getNextOrderIdCounter = async (connection) => {
  // Start a transaction
  await connection.beginTransaction();

  try {
    const dateString = new Date().toISOString().split("T")[0]; // Format: YYYY-MM-DD

    // Check if the counter for today exists
    const [rows] = await connection.execute(
      "SELECT counter FROM OrderIdCounter WHERE date = ? FOR UPDATE",
      [dateString]
    );

    let newCounter;
    if (rows.length === 0) {
      // If no counter exists for today, initialize it
      newCounter = 1;
      await connection.execute(
        "INSERT INTO OrderIdCounter (date, counter) VALUES (?, ?)",
        [dateString, newCounter]
      );
    } else {
      // Increment the counter
      const currentCounter = rows[0].counter;
      newCounter = currentCounter + 1;
      await connection.execute(
        "UPDATE OrderIdCounter SET counter = ? WHERE date = ?",
        [newCounter, dateString]
      );
    }

    // Commit the transaction
    await connection.commit();

    return newCounter;
  } catch (err) {
    // Rollback the transaction in case of error
    await connection.rollback();
    throw err;
  }
};

// Function to generate a unique order ID
const generateOrderId = async (connection) => {
  const prefix = "OS";
  const date = new Date();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const year = String(date.getFullYear()).slice(-2); // Get the last 2 digits of the year

  // Get the next counter value
  const counter = await getNextOrderIdCounter(connection);

  const orderId = `${prefix}${month}${day}${year}-${String(counter).padStart(
    4,
    "0"
  )}`; // Format: OSMMDDYY-0001

  return orderId;
};

// Add a new outbound shipment
app.post("/api/outbound-shipments", async (req, res) => {
  const {
    order_date,
    sku,
    item_quantity,
    warehouse_code,
    customer_name,
    country,
    address1,
    address2,
    zip_code,
    city,
    state,
    tracking_number,
    shipping_fee,
    note,
    image_link,
    vendor_number,
  } = req.body;

  try {
    const connection = await db.getConnection();
    await connection.beginTransaction();

    const order_id = await generateOrderId(connection); // Generate the order_id

    // Ensure all required fields are provided
    if (
      !order_date ||
      !sku ||
      !item_quantity ||
      !warehouse_code ||
      !customer_name ||
      !country ||
      !address1 ||
      !zip_code ||
      !city ||
      !state ||
      !vendor_number
    ) {
      await connection.rollback();
      connection.release();
      return res
        .status(400)
        .json({ success: false, error: "Missing required fields" });
    }

    // Fetch stock_check and outbound from the inventory table
    const [inventory] = await connection.execute(
      "SELECT stock_check, outbound FROM Inventory WHERE sku = ?",
      [sku]
    );

    if (inventory.length === 0) {
      await connection.rollback();
      connection.release();
      return res
        .status(404)
        .json({ success: false, error: "SKU not found in inventory" });
    }

    const stock_check = inventory[0].stock_check;

    // Ensure sufficient stock
    if (stock_check < item_quantity) {
      await connection.rollback();
      connection.release();
      return res
        .status(400)
        .json({ success: false, error: "Insufficient stock for the SKU" });
    }

    // Set optional fields to null if they are undefined
    const address2Value = address2 || null;
    const noteValue = note || null;
    const imageLinkValue = image_link || null;
    const trackingNumberValue = tracking_number || null;
    const shippingFeeValue = shipping_fee || 0.0;

    // Format the order_date to 'YYYY-MM-DD'
    const formattedOrderDate = formatDateForMySQL(new Date(order_date));

    // Insert the new outbound shipment
    const [result] = await connection.execute(
      `INSERT INTO Outbound_Shipments 
      (order_date, order_id, sku, item_quantity, warehouse_code, stock_check, customer_name, country, address1, address2, zip_code, city, state, tracking_number, shipping_fee, note, image_link, vendor_number) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        formattedOrderDate,
        order_id,
        sku,
        item_quantity,
        warehouse_code,
        stock_check,
        customer_name,
        country,
        address1,
        address2Value,
        zip_code,
        city,
        state,
        trackingNumberValue,
        shippingFeeValue,
        noteValue,
        imageLinkValue,
        vendor_number,
      ]
    );

    // Update the inventory table
    await connection.execute(
      `UPDATE Inventory 
      SET stock_check = stock_check - ?, outbound = outbound + ? 
      WHERE sku = ?`,
      [item_quantity, item_quantity, sku]
    );

    const insertedShipments = [
      {
        id: result.insertId,
        order_date: formattedOrderDate,
        order_id,
        sku,
        item_quantity,
        warehouse_code,
        stock_check,
        customer_name,
        country,
        address1,
        address2: address2Value,
        zip_code,
        city,
        state,
        tracking_number: trackingNumberValue,
        shipping_fee: shippingFeeValue,
        note: noteValue,
        image_link: imageLinkValue,
        vendor_number,
      },
    ];

    // Commit the transaction
    await connection.commit();
    connection.release();

    res.status(201).json({
      success: true,
      message: "Outbound shipment added successfully!",
      insertedShipments,
    });
  } catch (err) {
    console.error("Error adding outbound shipment:", err);
    res.status(500).json({ success: false, error: "Internal Server Error" });
  }
});

// Bulk upload outbound shipments
app.post("/api/outbound-shipments/bulk", async (req, res) => {
  const shipments = req.body;

  // Log the received outbound shipments for debugging
  console.log("Received outbound shipments:", shipments);

  if (!Array.isArray(shipments)) {
    return res
      .status(400)
      .json({ success: false, error: "Invalid data format" });
  }

  try {
    const connection = await db.getConnection();
    await connection.beginTransaction();

    const insertedShipments = [];

    for (const shipment of shipments) {
      const {
        order_date,
        sku,
        item_quantity,
        warehouse_code,
        customer_name,
        country,
        address1,
        address2,
        zip_code,
        city,
        state,
        tracking_number,
        shipping_fee,
        note,
        image_link,
        vendor_number,
      } = shipment;

      const order_id = await generateOrderId(connection); // Generate the order_id

      // Ensure all required fields are provided
      if (
        !order_date ||
        !sku ||
        !item_quantity ||
        !warehouse_code ||
        !customer_name ||
        !country ||
        !address1 ||
        !zip_code ||
        !city ||
        !state ||
        !tracking_number ||
        !shipping_fee ||
        !vendor_number
      ) {
        console.error(
          "Missing required fields in outbound shipment:",
          shipment
        );
        await connection.rollback();
        connection.release();
        return res
          .status(400)
          .json({ success: false, error: "Missing required fields" });
      }

      // Fetch stock_check and outbound from the inventory table
      const [inventory] = await connection.execute(
        "SELECT stock_check, outbound FROM Inventory WHERE sku = ?",
        [sku]
      );

      if (inventory.length === 0) {
        console.error("SKU not found in inventory:", sku);
        await connection.rollback();
        connection.release();
        return res
          .status(404)
          .json({ success: false, error: "SKU not found in inventory" });
      }

      const stock_check = inventory[0].stock_check;
      const outbound = inventory[0].outbound;

      // Ensure sufficient stock
      if (stock_check < item_quantity) {
        console.error("Insufficient stock for SKU:", sku);
        await connection.rollback();
        connection.release();
        return res
          .status(400)
          .json({ success: false, error: "Insufficient stock for the SKU" });
      }

      // Set optional fields to null if they are undefined
      const address2Value = address2 || null;
      const noteValue = note || null;
      const imageLinkValue = image_link || null;

      // Format the order_date to 'YYYY-MM-DD'
      const formattedOrderDate = formatDateForMySQL(new Date(order_date));

      // Insert the new outbound shipment
      const [result] = await connection.execute(
        `INSERT INTO Outbound_Shipments 
        (order_date, order_id, sku, item_quantity, warehouse_code, stock_check, customer_name, country, address1, address2, zip_code, city, state, tracking_number, shipping_fee, note, image_link, vendor_number) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
        [
          formattedOrderDate,
          order_id,
          sku,
          item_quantity,
          warehouse_code,
          stock_check,
          customer_name,
          country,
          address1,
          address2Value,
          zip_code,
          city,
          state,
          tracking_number,
          shipping_fee,
          noteValue,
          imageLinkValue,
          vendor_number,
        ]
      );

      // Add the newly inserted shipment to the array
      insertedShipments.push({
        id: result.insertId,
        order_date: formattedOrderDate,
        order_id,
        sku,
        item_quantity,
        warehouse_code,
        stock_check,
        customer_name,
        country,
        address1,
        address2: address2Value,
        zip_code,
        city,
        state,
        tracking_number,
        shipping_fee,
        note: noteValue,
        image_link: imageLinkValue,
        vendor_number,
      });

      // Update the inventory table
      await connection.execute(
        `UPDATE Inventory 
        SET stock_check = stock_check - ?, outbound = outbound + ? 
        WHERE sku = ?;`,
        [item_quantity, item_quantity, sku]
      );
    }

    // Commit the transaction
    await connection.commit();
    connection.release();

    res.status(201).json({
      success: true,
      message: "Outbound shipments added successfully!",
      updatedShipments: insertedShipments,
    });
  } catch (err) {
    console.error("Error adding outbound shipments:", err);
    res.status(500).json({ success: false, error: "Internal Server Error" });
  }
});

// Update an outbound shipment
app.put("/api/outbound-shipments/:id", async (req, res) => {
  const { id } = req.params;
  const {
    order_date,
    sku,
    item_quantity,
    warehouse_code,
    customer_name,
    country,
    address1,
    address2,
    zip_code,
    city,
    state,
    tracking_number,
    shipping_fee,
    note,
    image_link,
    vendor_number,
  } = req.body;

  try {
    const [existing] = await db.execute(
      "SELECT id, item_quantity FROM Outbound_Shipments WHERE id = ?",
      [id]
    );
    if (existing.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Outbound shipment not found" });
    }

    const oldItemQuantity = existing[0].item_quantity;

    // Fetch stock_check and outbound from the inventory table
    const [inventory] = await db.execute(
      "SELECT stock_check, outbound FROM Inventory WHERE sku = ?",
      [sku]
    );

    if (inventory.length === 0) {
      return res
        .status(404)
        .json({ success: false, error: "SKU not found in inventory" });
    }

    const stock_check = inventory[0].stock_check;

    // Ensure sufficient stock if item_quantity has increased
    if (
      item_quantity > oldItemQuantity &&
      stock_check < item_quantity - oldItemQuantity
    ) {
      return res
        .status(400)
        .json({ success: false, error: "Insufficient stock for the SKU" });
    }

    // Set optional fields to null if they are undefined
    const address2Value = address2 || null;
    const noteValue = note || null;
    const imageLinkValue = image_link || null;

    // Format the order_date to 'YYYY-MM-DD'
    const formattedOrderDate = formatDateForMySQL(new Date(order_date));

    // Log the parameters to debug
    console.log("Update Outbound Shipment Parameters:", {
      order_date: formattedOrderDate,
      sku,
      item_quantity,
      warehouse_code,
      stock_check,
      customer_name,
      country,
      address1,
      address2: address2Value,
      zip_code,
      city,
      state,
      tracking_number,
      shipping_fee,
      note: noteValue,
      image_link: imageLinkValue,
      vendor_number,
    });

    // Start a transaction
    const connection = await db.getConnection();
    await connection.beginTransaction();

    try {
      // Update the outbound shipment
      await connection.execute(
        `UPDATE Outbound_Shipments 
        SET order_date = ?, sku = ?, item_quantity = ?, warehouse_code = ?, customer_name = ?, country = ?, address1 = ?, address2 = ?, zip_code = ?, city = ?, state = ?, tracking_number = ?, shipping_fee = ?, note = ?, image_link = ?, vendor_number = ? 
        WHERE id = ?`,
        [
          formattedOrderDate,
          sku,
          item_quantity,
          warehouse_code,
          customer_name,
          country,
          address1,
          address2Value,
          zip_code,
          city,
          state,
          tracking_number,
          shipping_fee,
          noteValue,
          imageLinkValue,
          vendor_number,
          id,
        ]
      );

      // Update the inventory table if item_quantity has changed
      if (item_quantity !== oldItemQuantity) {
        const quantityDifference = item_quantity - oldItemQuantity;
        await connection.execute(
          `UPDATE Inventory 
          SET stock_check = stock_check - ?, outbound = outbound + ? 
          WHERE sku = ?`,
          [quantityDifference, quantityDifference, sku]
        );
      }

      // Commit the transaction
      await connection.commit();
      connection.release();

      res.json({
        success: true,
        message: "Outbound shipment updated successfully!",
      });
    } catch (err) {
      // Rollback the transaction in case of error
      await connection.rollback();
      connection.release();
      throw err;
    }
  } catch (err) {
    console.error("Error updating outbound shipment:", err);
    res.status(500).json({ success: false, error: "Internal Server Error" });
  }
});

// Delete an outbound shipment
app.delete("/api/outbound-shipments/:id", async (req, res) => {
  const { id } = req.params;
  try {
    // Fetch the outbound shipment to get the item_quantity and sku
    const [existing] = await db.execute(
      "SELECT id, sku, item_quantity FROM Outbound_Shipments WHERE id = ?",
      [id]
    );
    if (existing.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Outbound shipment not found" });
    }

    const { sku, item_quantity } = existing[0];

    // Start a transaction
    const connection = await db.getConnection();
    await connection.beginTransaction();

    try {
      // Delete the outbound shipment
      await connection.execute("DELETE FROM Outbound_Shipments WHERE id = ?", [
        id,
      ]);

      // Update the inventory table
      await connection.execute(
        `UPDATE Inventory 
        SET stock_check = stock_check + ?, outbound = outbound - ? 
        WHERE sku = ?`,
        [item_quantity, item_quantity, sku]
      );

      // Commit the transaction
      await connection.commit();
      connection.release();

      res.json({
        success: true,
        message: "Outbound shipment deleted successfully!",
      });
    } catch (err) {
      // Rollback the transaction in case of error
      await connection.rollback();
      connection.release();
      throw err;
    }
  } catch (err) {
    console.error("Error deleting outbound shipment:", err);
    res.status(500).json({ success: false, error: "Internal Server Error" });
  }
});

/* ------------------- CLAIMS CRUD ------------------- */

// Get all claims with related outbound shipment data
app.get("/api/claims", async (req, res) => {
  try {
    const [claims] = await db.execute(`
      SELECT 
        Claims.id,
        Claims.order_id,
        Outbound_Shipments.order_date,
        Claims.sku,
        Claims.item_quantity,
        Outbound_Shipments.customer_name,
        Outbound_Shipments.tracking_number,
        Outbound_Shipments.warehouse_code,
        Outbound_Shipments.shipping_fee,
        Claims.status,
        Claims.reason,
        Claims.response_action,
        Claims.created_at,
        Claims.updated_at
      FROM Claims
      INNER JOIN Outbound_Shipments
      ON Claims.order_id = Outbound_Shipments.order_id
    `);
    // console.log("Fetched claims:", claims); // Debugging log
    res.json(claims);
  } catch (err) {
    console.error("Error fetching claims:", err);
    res.status(500).json({ error: "Failed to fetch claims" });
  }
});

// Create a new claim
app.post("/api/claims", async (req, res) => {
  const {
    order_id,
    customer_name,
    sku,
    item_quantity,
    status,
    reason,
    tracking_number = null, // Default to null if not provided
    response_action,
  } = req.body;

  try {
    const [result] = await db.execute(
      `INSERT INTO Claims (order_id, customer_name, sku, item_quantity, status, reason, tracking_number, response_action, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [
        order_id,
        customer_name,
        sku,
        item_quantity,
        status,
        reason,
        tracking_number,
        response_action,
      ]
    );

    // Fetch the newly created claim
    const [newClaim] = await db.execute(`SELECT * FROM Claims WHERE id = ?`, [
      result.insertId,
    ]);

    res.status(201).json({
      success: true,
      message: "Claim created successfully!",
      claim: newClaim[0], // Send the new claim to the frontend
    });
  } catch (err) {
    console.error("Error creating claim:", err);
    res.status(500).json({ error: "Failed to create claim" });
  }
});

// Update a claim
app.put("/api/claims/:id", async (req, res) => {
  const { id } = req.params;
  const { reason, status, response_action } = req.body;

  try {
    const [result] = await db.execute(
      "UPDATE Claims SET reason = ?, status = ?, response_action = ?, updated_at = NOW() WHERE id = ?",
      [reason, status, response_action, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Claim not found" });
    }

    // Fetch the updated claim
    const [updatedClaim] = await db.execute(
      `SELECT * FROM Claims WHERE id = ?`,
      [id]
    );

    console.log("Updated claim:", updatedClaim); // Debugging log
    if (updatedClaim.length === 0) {
      return res.status(404).json({ error: "Claim not found" });
    }
    res.json({
      success: true,
      message: "Claim updated successfully!",
      claim: updatedClaim[0], // Ensure the updated claim is included in the response
    });
  } catch (err) {
    console.error("Error updating claim:", err);
    res.status(500).json({ error: "Failed to update claim" });
  }
});

// Delete a claim
app.delete("/api/claims/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const [result] = await db.execute("DELETE FROM Claims WHERE id = ?", [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Claim not found" });
    }

    res.json({ message: "Claim deleted successfully" });
  } catch (err) {
    console.error("Error deleting claim:", err);
    res.status(500).json({ error: "Failed to delete claim" });
  }
});

app.get("/api/outbound-shipments-for-claims", async (req, res) => {
  try {
    const [orders] = await db.execute(`
      SELECT 
        order_id, 
        sku, 
        customer_name, 
        item_quantity, 
        tracking_number 
      FROM Outbound_Shipments
    `);
    res.json(orders);
  } catch (err) {
    console.error("Error fetching outbound shipments:", err);
    res.status(500).json({ error: "Failed to fetch outbound shipments" });
  }
});

/* ------------------- USERS CRUD ------------------- */

// Login
app.post("/api/login", async (req, res) => {
  const { email, password } = req.body;
  try {
    // Execute query and destructure rows
    const [rows] = await db.execute(
      "SELECT * FROM Users WHERE LOWER(email) = LOWER(?)",
      [email]
    );

    // Log the rows to confirm correct format
    console.log("Rows from DB:", rows);

    // Ensure rows is an array
    if (!Array.isArray(rows)) {
      console.error("Unexpected rows format:", rows);
      return res
        .status(500)
        .json({ message: "Database error: Unexpected rows format" });
    }

    // Get the user
    const user = rows[0];
    if (!user) return res.status(401).json({ message: "Invalid credentials" });

    // Check if user is suspended
    if (user.activity_status === "suspended") {
      return res
        .status(403)
        .json({ message: "Account suspended. Please contact administrator." });
    }

    if (user.password === password) {
      console.log("Plain text password detected. Hashing and updating it...");
      const hashedPassword = await bcrypt.hash(password, 10);

      // Update the user's password in the database
      await db.execute("UPDATE Users SET password = ? WHERE id = ?", [
        hashedPassword,
        user.id,
      ]);

      // Update the user object to use the new hashed password
      user.password = hashedPassword;
    }

    // Verify the password
    const isPasswordMatch = await bcrypt.compare(password, user.password);
    console.log("Password provided:", password);
    console.log("Password from DB:", user.password);
    console.log("Password match:", isPasswordMatch);

    if (!isPasswordMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Update last_login timestamp
    await db.execute(
      "UPDATE Users SET last_login = CURRENT_TIMESTAMP WHERE id = ?",
      [user.id]
    );

    // Generate JWT token
    const token = generateToken(user);

    // Return user info and token (omit password)
    const { password: pwd, ...userWithoutPassword } = user;
    res.json({ token, user: userWithoutPassword });
  } catch (err) {
    console.error("Error during login:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// Fetch all users
app.get("/api/users", verifyToken, async (req, res) => {
  try {
    const [users] = await db.execute("SELECT * FROM Users");

    if (!Array.isArray(users)) {
      console.error("Invalid database response for users:", users);
      return res
        .status(500)
        .json({ message: "Server error: Invalid response format" });
    }

    users.forEach((user) => delete user.password); // Remove password before sending
    res.json(users); // Ensure users is an array
  } catch (err) {
    console.error("Error fetching users:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// Register (Add User)
app.post("/api/users", async (req, res) => {
  const { email, username, password, role, vendor_number } = req.body;

  try {
    console.log("Registering user with values:");
    console.log("Email:", email);
    console.log("Username:", username);
    console.log("Password:", password);
    console.log("Role:", role);
    console.log("Vendor Number:", vendor_number);

    const finalVendorNumber = vendor_number || null;

    // Check if email already exists
    const [existing] = await db.execute(
      "SELECT id FROM Users WHERE LOWER(email) = LOWER(?)",
      [email]
    );
    if (existing.length > 0) {
      return res.status(400).json({ message: "Email already exists" });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert the new user
    console.log("Inserting user into database...");
    const [result] = await db.execute(
      `INSERT INTO Users (email, username, password, role, vendor_number, activity_status)
       VALUES (?, ?, ?, ?, ?, 'active')`,
      [email, username, hashedPassword, role, finalVendorNumber]
    );
    console.log("Insert result:", result);

    // Retrieve the newly created user
    const [rows] = await db.execute("SELECT * FROM Users WHERE id = ?", [
      result.insertId,
    ]);
    const newUser = rows[0];
    const { password: pwd, ...userWithoutPassword } = newUser;

    res.status(201).json(userWithoutPassword);
  } catch (err) {
    console.error("Registration Error:", err);
    res.status(500).json({ message: err.message || "Server error" });
  }
});

// Update User
app.put("/api/users/:id", verifyToken, async (req, res) => {
  const userId = req.params.id;
  const { username, role, vendor_number, activity_status } = req.body;

  try {
    // Update the user
    await db.execute(
      `UPDATE Users
       SET username = ?, role = ?, vendor_number = ?, activity_status = ?
       WHERE id = ?`,
      [username, role, vendor_number, activity_status, userId]
    );
    // Retrieve the updated user
    const [rows] = await db.execute("SELECT * FROM Users WHERE id = ?", [
      userId,
    ]);
    // Remove password before sending
    const updatedUser = rows[0];
    const { password: pwd, ...userWithoutPassword } = updatedUser;
    res.json(userWithoutPassword);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// Delete User
app.delete("/api/users/:id", verifyToken, async (req, res) => {
  const userId = req.params.id;
  try {
    // Ensure not deleting the last admin.
    const [admins] = await db.execute(
      "SELECT id FROM Users WHERE role = ? AND id != ?",
      ["admin", userId]
    );
    if (admins.length === 0) {
      return res
        .status(400)
        .json({ message: "Cannot delete the last admin account" });
    }
    await db.execute("DELETE FROM Users WHERE id = ?", [userId]);
    res.json({ message: "User deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// Suspend User
app.put("/api/users/:id/suspend", verifyToken, async (req, res) => {
  const userId = req.params.id;
  try {
    await db.execute("UPDATE Users SET activity_status = ? WHERE id = ?", [
      "suspended",
      userId,
    ]);
    res.json({ message: "User suspended" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// Activate User Account
app.put("/api/users/:id/activate", verifyToken, async (req, res) => {
  const userId = req.params.id;
  try {
    await db.execute("UPDATE Users SET activity_status = ? WHERE id = ?", [
      "active",
      userId,
    ]);
    res.json({ message: "User activated" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// Reset User Password
app.put("/api/users/:id/reset-password", verifyToken, async (req, res) => {
  const userId = req.params.id;
  const { newPassword } = req.body;

  if (!newPassword) {
    return res.status(400).json({ message: "New password is required" });
  }

  try {
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await db.execute("UPDATE Users SET password = ? WHERE id = ?", [
      hashedPassword,
      userId,
    ]);
    res.json({
      message: "Password reset successfully",
      hashedPassword,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// Activate user using a token (e.g., from an invitation email)
// Here, we use decodeToken (a helper that verifies a token string and returns its payload)
app.post("/api/activate", async (req, res) => {
  const { token, password } = req.body;
  try {
    // Decode the token using our helper function.
    const decoded = decodeToken(token);
    const [rows] = await db.execute(
      "SELECT * FROM Users WHERE LOWER(email) = LOWER(?)",
      [decoded.email]
    );
    const user = rows[0];
    if (!user) return res.status(404).json({ message: "User not found" });

    const hashedPassword = await bcrypt.hash(password, 10);
    await db.execute(
      "UPDATE Users SET password = ?, activity_status = ? WHERE id = ?",
      [hashedPassword, "active", user.id]
    );
    res.json({ message: "User activated successfully" });
  } catch (err) {
    console.error(err);
    res.status(401).json({ message: "Invalid or expired token" });
  }
});

/* ------------------- END USERS CRUD ------------------- */

/* ------------------- START BILLINGS CRUD ------------------- */

// View all billings
app.get("/api/billings", verifyToken, async (req, res) => {
  try {
    const [billings] = await db.execute("SELECT * FROM Billing");
    res.json(billings);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// Add a billing
app.post("/api/billings", async (req, res) => {
  const {
    order_id,
    vendor_number,
    shipping_fee,
    billing_date,
    notes,
    status,
    paid_on,
  } = req.body;

  try {
    const [result] = await db.execute(
      "INSERT INTO Billing (order_id, vendor_number, shipping_fee, billing_date, notes, status, paid_on) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [
        order_id,
        vendor_number,
        shipping_fee,
        billing_date,
        notes,
        status,
        paid_on,
      ]
    );

    const [newBilling] = await db.execute(
      "SELECT * FROM Billing WHERE id = ?",
      [result.insertId]
    );
    res.status(201).json(newBilling[0]); // Return the full Billing object
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error creating billing" });
  }
});

// Bulk upload billings
app.post("/api/billings/bulk", verifyToken, async (req, res) => {
  const billings = req.body;

  // Validate that the input is an array
  if (!Array.isArray(billings)) {
    return res
      .status(400)
      .json({ message: "Invalid data format. Expected an array." });
  }

  try {
    const connection = await db.getConnection();
    await connection.beginTransaction();

    const insertedBillings = []; // Array to store newly inserted billing records

    for (const billing of billings) {
      const {
        order_id,
        vendor_number,
        shipping_fee,
        billing_date,
        notes,
        status,
        paid_on,
      } = billing;

      // Validate required fields
      if (!order_id) {
        await connection.rollback();
        connection.release();
        return res
          .status(400)
          .json({ message: "Missing required field: order_id" });
      }

      // Replace undefined values with defaults or null
      const formattedVendorNumber = vendor_number || null;
      const formattedShippingFee = shipping_fee || 0; // Default to 0 if undefined
      const formattedBillingDate = billing_date
        ? formatDateForMySQL(new Date(billing_date))
        : null;
      const formattedNotes = notes || null;
      const formattedStatus = status || "Pending"; // Default to "Pending"
      const formattedPaidOn = paid_on
        ? formatDateForMySQL(new Date(paid_on))
        : null;

      // Insert the billing into the database
      const [result] = await connection.execute(
        `INSERT INTO Billing (order_id, vendor_number, shipping_fee, billing_date, notes, status, paid_on)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          order_id,
          formattedVendorNumber,
          formattedShippingFee,
          formattedBillingDate,
          formattedNotes,
          formattedStatus,
          formattedPaidOn,
        ]
      );

      // Add the newly inserted billing to the array
      insertedBillings.push({
        id: result.insertId,
        order_id,
        vendor_number: formattedVendorNumber,
        shipping_fee: formattedShippingFee,
        billing_date: formattedBillingDate,
        notes: formattedNotes,
        status: formattedStatus,
        paid_on: formattedPaidOn,
      });
    }

    // Commit the transaction
    await connection.commit();
    connection.release();

    res.status(201).json({
      message: "Billings uploaded successfully!",
      insertedBillings, // Return the inserted billings
    });
  } catch (err) {
    console.error("Error during bulk upload of billings:", err);
    res.status(500).json({ message: "Server error during bulk upload" });
  }
});

// Update a billing
app.put("/api/billings/:id", verifyToken, async (req, res) => {
  const { id } = req.params;
  const {
    order_id,
    vendor_number,
    shipping_fee,
    billing_date,
    notes,
    status,
    paid_on,
  } = req.body;

  try {
    // Validate required fields
    if (!order_id) {
      return res
        .status(400)
        .json({ message: "Missing required field: order_id" });
    }

    // Replace undefined values with null
    const formattedOrderId = order_id || null;
    const formattedVendorNumber = vendor_number || null;
    const formattedShippingFee = shipping_fee || 0; // Default to 0 if undefined
    const formattedBillingDate = billing_date
      ? formatDateForMySQL(new Date(billing_date))
      : null;
    const formattedNotes = notes || null;
    const formattedStatus = status || null;
    const formattedPaidOn = paid_on
      ? formatDateForMySQL(new Date(paid_on))
      : null;

    console.log("Update Billing Parameters:", {
      order_id: formattedOrderId,
      vendor_number: formattedVendorNumber,
      shipping_fee: formattedShippingFee,
      billing_date: formattedBillingDate,
      notes: formattedNotes,
      status: formattedStatus,
      paid_on: formattedPaidOn,
      id,
    });

    // Execute the SQL query
    const [result] = await db.execute(
      `UPDATE Billing 
       SET order_id = ?, vendor_number = ?, shipping_fee = ?, billing_date = ?, 
           notes = ?, status = ?, paid_on = ? 
       WHERE id = ?`,
      [
        formattedOrderId,
        formattedVendorNumber,
        formattedShippingFee,
        formattedBillingDate,
        formattedNotes,
        formattedStatus,
        formattedPaidOn,
        id,
      ]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Billing not found" });
    }

    // Synchronize with OutboundShipments
    await db.execute(
      `UPDATE Outbound_Shipments 
       SET shipping_fee = ? 
       WHERE order_id = ?`,
      [shipping_fee, order_id]
    );

    res.json({ message: "Billing updated successfully" });
  } catch (err) {
    console.error("Error updating billing:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// Delete a billing
app.delete("/api/billings/:id", verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const [result] = await db.execute("DELETE FROM Billing WHERE id = ?", [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Billing not found" });
    }

    res.json({ message: "Billing deleted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// Mark a billing as paid
app.put("/api/billings/:id/mark-paid", verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const [result] = await db.execute(
      "UPDATE Billing SET status = 'Paid', paid_on = CURRENT_DATE WHERE id = ?",
      [id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Billing not found" });
    }

    res.json({ message: "Billing marked as paid" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// Cancel a billing
app.put("/api/billings/:id/cancel", verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const [result] = await db.execute(
      "UPDATE Billing SET status = 'Cancelled' WHERE id = ?",
      [id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Billing not found" });
    }

    res.json({ message: "Billing cancelled" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

/* ------------------- END BILLINGS CRUD ------------------- */

// Start the server
app.listen(port, () => {
  console.log(`Backend running on http://localhost:${port}`);
});

module.exports = app;
