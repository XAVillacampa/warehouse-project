CREATE DATABASE `Products`;
drop database `Products`;


-- Create the database if it doesn't exist
USE `Products`;

-- Switch to the correct database
CREATE TABLE
  inventory (
    sku VARCHAR(50) NOT NULL,
    name VARCHAR(255),
    quantity INT,
    minStockLevel INT,
    warehouse_code VARCHAR(100),
    vendor_number varchar(45),
    weight DECIMAL(10, 2),
    height DECIMAL(10, 2),
    length DECIMAL(10, 2),
    width DECIMAL(10, 2),
    unit_cbm DECIMAL(10, 6),
    PRIMARY KEY (sku)
  );

select * from inventory;

ALTER TABLE inventory MODIFY COLUMN warehouse_code VARCHAR(100) Unique;

-- Users Table
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY NOT NULL,
    email VARCHAR(50) NOT NULL UNIQUE,
    username VARCHAR(50) NOT NULL UNIQUE,
    password CHAR(100),
    role ENUM('admin', 'vendor', 'staff') NOT NULL,
    vendor_number VARCHAR(50) NULL,
    activity_status ENUM('active', 'suspended') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    last_login TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_vendor_number (vendor_number) -- Ensure this is indexed for FK usage
);

DELETE FROM inventory
WHERE
  sku = 'A123';

DELETE FROM inventory
WHERE
  sku = 'B123';

DELETE FROM inventory
WHERE
  sku = 'C123';

insert into
  users (
    id,
    email,
    username,
    password,
    role,
    vendor_number,
    activity_status
  )
values
  (
    '1',
    'Admin@7seacorp.com',
    'Admin User',
    '7seacorp.com',
    'Admin',
    'ALL',
    'active'
  ),
  (
    '2',
    'Vendor@7seacorp.com',
    'Vendor User',
    '7seacorp.com',
    'Vendor',
    'V001',
    'active'
  );

drop table users;

-- Orders Table
CREATE TABLE
  orders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    type ENUM ('inbound', 'outbound') NOT NULL,
    sku VARCHAR(50) NOT NULL, -- Foreign key to inventory table
    vendor_number varchar(50), -- foreign key to inventory
    quantity INT NOT NULL,
    notes TEXT,
    handler CHAR(50),
    workflow_number VARCHAR(50) Unique,
    status ENUM ('pending', 'completed', 'cancelled') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (sku) REFERENCES inventory (sku)
  );

INSERT INTO
  inventory (
    sku,
    name,
    quantity,
    minStockLevel,
    warehouse_code,
    vendor_number,
    weight,
    height,
    length,
    width,
    unit_cbm
  )
VALUES
  (
    'A123',
    'Product A',
    100,
    '15',
    'Shelf 1',
    101,
    5.5,
    '2.5',
    '3.5',
    '4.5',
    '.025'
  ), -- 
  (
    'B123',
    'Product B',
    200,
    '25',
    'Shelf 2',
    202,
    10.5,
    '22.5',
    '23.5',
    '34.5',
    '1.025'
  ),
  (
    'C123',
    'Product C',
    300,
    '35',
    'Shelf 3',
    303,
    15.5,
    '12.5',
    '33.5',
    '44.5',
    '2.025'
  );

SELECT
  *
FROM
  inventory;

SELECT
  *
FROM
  USERS;

SELECT
  *
FROM
  orders;

CREATE TABLE
  workflow_counter (
    id INT PRIMARY KEY AUTO_INCREMENT,
    latest_number INT NOT NULL
  );

INSERT INTO
  workflow_counter (latest_number)
VALUES
  (0);

drop table orders;

ALTER TABLE users MODIFY COLUMN vendor_number varchar(50);

SHOW TABLES;


CREATE INDEX idx_vendor_number ON users (vendor_number);

CREATE TABLE
  billings (
    id INT PRIMARY KEY AUTO_INCREMENT,
    invoice_number varchar(50) unique not null,
    workflow_number VARCHAR(50),
    vendor_number varchar(50),
    amount DECIMAL(10, 2),
    due_date DATE,
    notes TEXT,
    status ENUM ('pending', 'paid', 'cancelled') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (workflow_number) REFERENCES orders (workflow_number)
  );

  insert into billings (id, invoice_number, workflow_number, vendor_number, amount, notes, status)
  values ("1", "INV-001", "WF0225-001", "V001", "2000", "Hi", "pending");

select * from billings;
DROP TABLE billings;