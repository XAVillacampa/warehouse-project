-- Active: 1738731268661@@127.0.0.1@3306@itemsdb
CREATE DATABASE `ItemsDB`;

USE `ItemsDB`;

drop database `ItemsDB`;

CREATE TABLE Inventory (
  id INT AUTO_INCREMENT PRIMARY KEY,
  product_name VARCHAR(255) NOT NULL,
  sku VARCHAR(100) NOT NULL UNIQUE,
  warehouse_code VARCHAR(10) NOT NULL,
  stock_check INT NOT NULL DEFAULT 0,
  outbound INT NOT NULL DEFAULT 0,
  weight DECIMAL(5, 2) NOT NULL CHECK (weight > 0),
  height DECIMAL(5, 2) NOT NULL CHECK (height > 0),
  length DECIMAL(5, 2) NOT NULL CHECK (length > 0),
  width DECIMAL(5, 2) NOT NULL CHECK (width > 0),
  cbm DECIMAL(5, 5) NOT NULL CHECK (cbm > 0),
  vendor_number VARCHAR(45),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_warehouse_code (warehouse_code)
);

INSERT INTO
  Inventory (
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
    vendor_number
  )
VALUES
  (
    'Rhino1',
    'EIONQWE',
    'WC001',
    40,
    20,
    10,
    1.4,
    3,
    5,
    0.05,
    'V001'
  );

select
  *
from
  inventory;

CREATE TABLE Inbound_Shipments (
  shipment_id INT AUTO_INCREMENT PRIMARY KEY,
  shipping_date DATE NOT NULL,
  box_label VARCHAR(50) NOT NULL,
  sku VARCHAR(100) NOT NULL,
  warehouse_code VARCHAR(10) NOT NULL,
  quantity INT NOT NULL CHECK (quantity >= 0),
  arriving_date DATE NOT NULL,
  tracking_number VARCHAR(50) NOT NULL UNIQUE,
  vendor_number VARCHAR(45),
  FOREIGN KEY (sku) REFERENCES Inventory (sku) ON DELETE CASCADE,
  FOREIGN KEY (warehouse_code) REFERENCES Inventory (warehouse_code) ON DELETE CASCADE,
  FOREIGN KEY (vendor_number) REFERENCES Users (vendor_number) ON DELETE
  SET
    NULL
);

select
  *
from
  inbound_shipments;

INSERT INTO
  Inbound_Shipments (
    shipping_date,
    box_label,
    sku,
    warehouse_code,
    quantity,
    arriving_date,
    tracking_number,
    vendor_number
  )
VALUES
  (
    '2025-03-01',
    'BOX12345',
    'EIONQWE',
    'WC001',
    50,
    '2025-03-05',
    'TRACK12345',
    'V001'
  ),
  (
    '2025-03-01',
    'BOX1',
    'EIONQWE',
    'WC001',
    40,
    '2025-03-05',
    'TRACK42133',
    'V001'
  );

CREATE TABLE Outbound_Shipments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  order_date DATE NOT NULL,
  order_id VARCHAR(20) NOT NULL,
  sku VARCHAR(100) NOT NULL,
  item_quantity INT NOT NULL DEFAULT 1,
  warehouse_code VARCHAR(10) NOT NULL,
  stock_check INT NOT NULL,
  customer_name VARCHAR(100) NOT NULL,
  country VARCHAR(255) NOT NULL,
  address1 VARCHAR(255) NOT NULL,
  address2 VARCHAR(255) NULL,
  zip_code VARCHAR(20) NOT NULL,
  city VARCHAR(100) NOT NULL,
  state VARCHAR(100) NOT NULL,
  tracking VARCHAR(50) NOT NULL,
  shipping_fee DECIMAL(10, 2) NOT NULL,
  note TEXT NULL,
  image_link VARCHAR(255) NULL,
  vendor_number VARCHAR(45),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (sku) REFERENCES Inventory (sku) ON DELETE CASCADE,
  FOREIGN KEY (warehouse_code) REFERENCES Inventory (warehouse_code) ON DELETE CASCADE,
  UNIQUE (order_id),
  UNIQUE (tracking)
);

ALTER TABLE
  Outbound_Shipments
MODIFY
  COLUMN tracking VARCHAR(50) NOT NULL UNIQUE;

select
  *
from
  outbound_shipments;

INSERT INTO
  Outbound_Shipments (
    order_date,
    order_id,
    sku,
    item_quantity,
    warehouse_code,
    stock_check,
    customer_name,
    country,
    address1,
    address2,
    zip_code,
    city,
    state,
    tracking,
    shipping_fee,
    note,
    image_link,
    vendor_number
  )
VALUES
  (
    '2025-02-27',
    '#RHINO1',
    'EIONQWE',
    20,
    'WC001',
    20,
    'John Doe',
    'US',
    '123 Main St',
    NULL,
    '90001',
    'Los Angeles',
    'California',
    'TRK12345',
    10.50,
    'Handle with care',
    NULL,
    'V001'
  );

CREATE TABLE Claims (
  id INT AUTO_INCREMENT PRIMARY KEY,
  order_id VARCHAR(20) NOT NULL,
  order_date DATE NOT NULL,
  sku VARCHAR(100) NOT NULL,
  item_quantity INT NOT NULL DEFAULT 1,
  warehouse_code VARCHAR(10) NOT NULL,
  stock_check INT DEFAULT 0,
  customer_name VARCHAR(255) NOT NULL,
  country VARCHAR(50) NOT NULL,
  address1 VARCHAR(255) NOT NULL,
  address2 VARCHAR(255),
  zip_code VARCHAR(20) NOT NULL,
  city VARCHAR(100) NOT NULL,
  state VARCHAR(50) NOT NULL,
  tracking_number VARCHAR(50) NOT NULL,
  shipping_fee DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  reason TEXT NOT NULL,
  status ENUM ('Solved', 'Denied', 'New', 'Claimed') NOT NULL,
  response_action TEXT,
  invoice_link TEXT,
  note TEXT,
  vendor_number VARCHAR(45),
  FOREIGN KEY (order_id) REFERENCES Outbound_Shipments (order_id) ON DELETE CASCADE,
  FOREIGN KEY (sku) REFERENCES Inventory (sku) ON DELETE CASCADE
);

select
  *
from
  claims;

INSERT INTO
  Claims (
    order_id,
    claim_date,
    sku,
    item_quantity,
    warehouse_code,
    stock_check,
    customer_name,
    country,
    address1,
    address2,
    zip_code,
    city,
    state,
    tracking_number,
    shipping_fee,
    reason,
    status,
    response_action,
    invoice_link,
    note,
    vendor_number
  )
VALUES
  (
    '#RHINO1',
    '2025-03-01',
    'EIONQWE',
    5,
    'WC001',
    15,
    'John Doe',
    'US',
    '123 Main St',
    NULL,
    '90001',
    'Los Angeles',
    'California',
    'TRK12345',
    0.00,
    'Damaged item upon arrival',
    'New',
    NULL,
    NULL,
    'Customer reported damage on delivery.',
    'V001'
  );

CREATE TABLE Users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(50) NOT NULL UNIQUE,
  username VARCHAR(50) NOT NULL UNIQUE,
  password CHAR(100) NOT NULL,
  role ENUM ('admin', 'vendor', 'staff') NOT NULL,
  vendor_number VARCHAR(50) NULL,
  activity_status ENUM ('active', 'suspended') DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  last_login TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_vendor_number (vendor_number)
);

select
  *
from
  users;

INSERT INTO
  Users (
    email,
    username,
    password,
    role,
    vendor_number,
    activity_status
  )
VALUES
  (
    'Admin@7seacorp.com',
    'AdminUser',
    'admin1',
    'admin',
    'ALL',
    'active'
  ),
  (
    'Vendor@7seacorp.com',
    'VendorUser',
    'vendor1',
    'vendor',
    'V001',
    'active'
  );

CREATE TABLE OrderIdCounter (
  id INT AUTO_INCREMENT PRIMARY KEY,
  date DATE NOT NULL,
  counter INT NOT NULL
);

-- Initialize the counter with a starting value
INSERT INTO
  OrderIdCounter (date, counter)
VALUES
  (CURDATE(), 0);