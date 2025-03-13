const express = require("express");
const mysql = require("mysql2/promise");
const cors = require("cors");
const dotenv = require("dotenv");
const bcrypt = require("bcrypt");
const { verifyToken, generateToken, decodeToken } = require("./authUsers");

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

app.use(express.json());
app.use(
  cors({
    origin: "http://localhost:5173",
  })
);

// Create MySQL connection
const db = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
});

// Function to format a Date object to 'YYYY-MM-DD'
function formatDateForMySQL(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

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
    const [results] = await db.execute("SELECT * FROM inventory;");
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
      "SELECT sku FROM inventory WHERE sku = ?",
      [sku]
    );
    if (existing.length > 0) {
      return res
        .status(400)
        .json({ success: false, message: "SKU already exists" });
    }

    // Insert into the database
    await db.execute(
      `INSERT INTO inventory 
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
      "SELECT sku FROM inventory WHERE sku = ?",
      [sku]
    );
    if (existing.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Product not found" });
    }

    // Correct the SQL query
    await db.execute(
      `UPDATE inventory 
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
      "SELECT sku FROM inventory WHERE sku = ?",
      [sku]
    );
    if (existing.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Product not found" });
    }

    await db.execute("DELETE FROM inventory WHERE sku = ?", [sku]);
    res.json({ message: "Product deleted successfully" });
  } catch (err) {
    console.error("Error deleting product:", err);
    res.status(500).json({ success: false, error: "Internal Server Error" });
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
        "SELECT sku FROM inventory WHERE sku = ?",
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
        "SELECT warehouse_code FROM inventory WHERE warehouse_code = ?",
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
          "SELECT sku FROM inventory WHERE sku = ?",
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
          "SELECT warehouse_code FROM inventory WHERE warehouse_code = ?",
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
    const [results] = await db.execute("SELECT * FROM outbound_shipments;");
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
  const year = String(date.getFullYear()).slice(-2); // Get the last 2 digits of the year

  // Get the next counter value
  const counter = await getNextOrderIdCounter(connection);

  const orderId = `${prefix}${month}${year}-${String(counter).padStart(
    4,
    "0"
  )}`; // Format: OSMMYY-0001

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
    // Start a transaction
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
      "SELECT stock_check, outbound FROM inventory WHERE sku = ?",
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
    const outbound = inventory[0].outbound;

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

    // Log the parameters to debug
    console.log("Parameters:", {
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
    });

    // Insert the new outbound shipment
    await connection.execute(
      `INSERT INTO outbound_shipments 
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
      `UPDATE inventory 
      SET stock_check = stock_check - ?, outbound = outbound + ? 
      WHERE sku = ?`,
      [item_quantity, item_quantity, sku]
    );

    // Commit the transaction
    await connection.commit();
    connection.release();

    res.status(201).json({
      success: true,
      message: "Outbound shipment added successfully!",
      order_id,
    });
  } catch (err) {
    console.error("Error adding outbound shipment:", err);
    res.status(500).json({ success: false, error: "Internal Server Error" });
  }
});

// Bulk upload outbound shipments
app.post("/api/outbound-shipments/bulk", async (req, res) => {
  const shipments = req.body;

  // Log the received shipments for debugging
  console.log("Received outbound shipments:", shipments);

  if (!Array.isArray(shipments)) {
    return res
      .status(400)
      .json({ success: false, error: "Invalid data format" });
  }

  try {
    const connection = await db.getConnection();
    await connection.beginTransaction();

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
        "SELECT stock_check, outbound FROM inventory WHERE sku = ?",
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
      await connection.execute(
        `INSERT INTO outbound_shipments 
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

      // Update the inventory table
      await connection.execute(
        `UPDATE inventory 
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
      "SELECT id, item_quantity FROM outbound_shipments WHERE id = ?",
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
      "SELECT stock_check, outbound FROM inventory WHERE sku = ?",
      [sku]
    );

    if (inventory.length === 0) {
      return res
        .status(404)
        .json({ success: false, error: "SKU not found in inventory" });
    }

    const stock_check = inventory[0].stock_check;
    const outbound = inventory[0].outbound;

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
    console.log("Parameters:", {
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
        `UPDATE outbound_shipments 
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
          `UPDATE inventory 
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
      "SELECT id, sku, item_quantity FROM outbound_shipments WHERE id = ?",
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
      await connection.execute("DELETE FROM outbound_shipments WHERE id = ?", [
        id,
      ]);

      // Update the inventory table
      await connection.execute(
        `UPDATE inventory 
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

/* ------------------- USERS CRUD ------------------- */

// Login
app.post("/api/login", async (req, res) => {
  const { email, password } = req.body;
  try {
    // Execute query and destructure rows
    const [rows] = await db.execute(
      "SELECT * FROM users WHERE LOWER(email) = LOWER(?)",
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
      await db.execute("UPDATE users SET password = ? WHERE id = ?", [
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
      "UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?",
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
    const [users] = await db.execute("SELECT * FROM users");

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
      "SELECT id FROM users WHERE LOWER(email) = LOWER(?)",
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
      `INSERT INTO users (email, username, password, role, vendor_number, activity_status)
       VALUES (?, ?, ?, ?, ?, 'active')`,
      [email, username, hashedPassword, role, finalVendorNumber]
    );
    console.log("Insert result:", result);

    // Retrieve the newly created user
    const [rows] = await db.execute("SELECT * FROM users WHERE id = ?", [
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
      `UPDATE users
       SET username = ?, role = ?, vendor_number = ?, activity_status = ?
       WHERE id = ?`,
      [username, role, vendor_number, activity_status, userId]
    );
    // Retrieve the updated user
    const [rows] = await db.execute("SELECT * FROM users WHERE id = ?", [
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
      "SELECT id FROM users WHERE role = ? AND id != ?",
      ["admin", userId]
    );
    if (admins.length === 0) {
      return res
        .status(400)
        .json({ message: "Cannot delete the last admin account" });
    }
    await db.execute("DELETE FROM users WHERE id = ?", [userId]);
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
    await db.execute("UPDATE users SET activity_status = ? WHERE id = ?", [
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
    await db.execute("UPDATE users SET activity_status = ? WHERE id = ?", [
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
    await db.execute("UPDATE users SET password = ? WHERE id = ?", [
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
      "SELECT * FROM users WHERE LOWER(email) = LOWER(?)",
      [decoded.email]
    );
    const user = rows[0];
    if (!user) return res.status(404).json({ message: "User not found" });

    const hashedPassword = await bcrypt.hash(password, 10);
    await db.execute(
      "UPDATE users SET password = ?, activity_status = ? WHERE id = ?",
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
    const [billings] = await db.execute("SELECT * FROM billing");
    res.json(billings);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// Add a billing
app.post("/api/billings", verifyToken, async (req, res) => {
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
    // Convert billing_date to 'YYYY-MM-DD' format
    const formattedBillingDate = formatDateForMySQL(new Date(billing_date));
    const formattedPaidOn = paid_on
      ? formatDateForMySQL(new Date(paid_on))
      : null;

    await db.execute(
      "INSERT INTO billing (order_id, vendor_number, shipping_fee, billing_date, notes, status, paid_on) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [
        order_id,
        vendor_number,
        shipping_fee,
        formattedBillingDate,
        notes,
        status,
        formattedPaidOn,
      ]
    );

    res.status(201).json({ message: "Billing added successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// Update a billing
app.put("/api/billings/:id", verifyToken, async (req, res) => {
  try {
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

    const formattedBillingDate = formatDateForMySQL(new Date(billing_date));
    const formattedPaidOn = paid_on
      ? formatDateForMySQL(new Date(paid_on))
      : null;

    const [result] = await db.execute(
      "UPDATE billing SET order_id = ?, vendor_number = ?, shipping_fee = ?, billing_date = ?, notes = ?, status = ?, paid_on = ? WHERE id = ?",
      [
        order_id,
        vendor_number,
        shipping_fee,
        formattedBillingDate,
        notes,
        status,
        formattedPaidOn,
        id,
      ]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Billing not found" });
    }

    res.json({ message: "Billing updated successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// Delete a billing
app.delete("/api/billings/:id", verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const [result] = await db.execute("DELETE FROM billing WHERE id = ?", [id]);

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
      "UPDATE billing SET status = 'Paid', paid_on = CURRENT_DATE WHERE id = ?",
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
      "UPDATE billing SET status = 'Cancelled' WHERE id = ?",
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
