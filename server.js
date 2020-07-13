const express = require("express");
const app = express();
const secrets = require("./secrets");
const bodyParser = require("body-parser");
const { Pool } = require("pg");
const session = require("express-session");

const pool = new Pool({
  user: "postgres",
  host: "localhost",
  database: "cyf_ecommerce",
  password: secrets.dbPassword,
  port: 5432,
});

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(
  session({
    secret: "secret",
    resave: true,
    saveUninitialized: true,
  })
);

app.get("/products", (req, res) => {
  console.log("products received");
  pool.query("SELECT * FROM products", (error, result) => {
    res.json(result.rows);
  });
});

app.get("/products/:id", function (req, res) {
  const productId = req.params.id;

  console.log(`received the product id ${productId}`);

  pool
    .query("SELECT * FROM products WHERE id=$1", [productId])
    .then((result) => res.json(result.rows))
    .catch((e) => console.error(e));
});

app.get("/products/", function (req, res) {
  const productName = req.query.name;
  let query = "select * from products ";
  if (productName) {
    query = query + `where products.product_name ilike '%${productName}%'`;
  }
  console.log(query);
  pool
    .query(query)
    .then((result) => res.json(result.rows))
    .catch((e) => console.error(e));
});

app.get("/orders", (req, res) => {
  pool.query("SELECT * FROM orders", (error, result) => {
    res.json(result.rows);
  });
});

app.get("/customers", (req, res) => {
  pool.query("SELECT * FROM customers", (error, result) => {
    res.json(result.rows);
  });
});
app.get("/users", (req, res) => {
  pool.query("SELECT * FROM users", (error, result) => {
    res.json(result.rows);
  });
});

app.get("/customers/:customerId", function (req, res) {
  const customerId = req.params.customerId;
  pool
    .query("SELECT * FROM customers WHERE id=$1", [customerId])
    .then((result) => res.json(result.rows))
    .catch((e) => console.error(e));
});

app.get("/customers/:customerId/orders", (req, res) => {
  const customerId = req.params.customerId;
  const query =
    "select c.name ,o.order_reference, o.order_date, p.product_name, p.unit_price,oi.quantity from customers c join orders o on o.customer_id = c.id join order_items oi on oi.order_id =o.id join products p on p.id =oi.product_id where c.id =$1";
  pool
    .query(query, [customerId])
    .then((result) => res.json(result.rows))
    .catch((e) => console.error(e));
});

app.post("/products", function (req, res) {
  const ProductName = req.body.product_name;

  const ProductPrice = req.body.unit_price;

  if (!Number.isInteger(ProductPrice) || ProductPrice <= 0) {
    return res.status(400).send("The price should be a positive integer.");
  } else {
    const query =
      "INSERT INTO products (product_name, unit_price) VALUES ($1, $2)";
    pool
      .query(query, [ProductName, ProductPrice])
      .then(() => res.send("Product added!"))
      .catch((e) => console.error(e));
  }
});
//create user
app.post("/users", (req, res) => {
  let name = req.body.username;
  let email = req.body.email;
  let password = req.body.password;

  if (name && password && email) {
    pool.query(
      "INSERT INTO users (username, email, password) VALUES ($1, $2, $3)",
      [name, email, password]
    );
    res.status(201).send("User created and saved to database.");
  } else {
    res.status(400).send("Review your requests body.");
  }
});

app.post("/signin", (request, response) => {
  let username = request.body.username;
  let password = request.body.password;

  let parameters = [username, password];
  if (username && password) {
    pool.query(
      "SELECT * FROM users WHERE email = $1 AND password = $2",
      parameters,
      (error, results => {
        if (results.rowCount > 0) {
          let userName = results.rows[0].username;
          request.session.loggedin = true;
          request.session.username = userName;
          response.send("Successfully logged in");
        } else {
          response.send("Incorrect Username and/or Password!");
        }
        response.end();
      }
    );
  } else {
    response.send("Please enter Username and Password!");
    response.end();
  }
});

app.post("/logout", (request, response) => {
  request.session.loggedin = false;
  response.send("You are successfully logged out.");
});

app.get("/", (req, res) => {
  if (req.session.loggedin) {
    res.send("Welcome back, " + req.session.username + "!");
  } else {
    res.send("Please login to view this page!");
  }
  res.end();
});

app.post("/logout", (req, res) => {
  req.session.loggedin = false;
  res.send("You are successfully logged out.");
});

app.post("/customers", (req, res) => {
  const newCustomerName = req.body.name;
  const newCustomerAddress = req.body.address;
  const newCustomerCity = req.body.city;
  const newCustomerCountry = req.body.country;

  const query =
    "INSERT INTO customers (name,address,city,country) VALUES ($1,$2,$3,$4)";
  const params = [
    newCustomerName,
    newCustomerAddress,
    newCustomerCity,
    newCustomerCountry,
  ];
  pool
    .query(query, params)
    .then(() => res.send("Customer Created!"))
    .catch((e) => res.status(500).send(e));
});

app.post("/customers/:customerId/orders", function (req, res) {
  const customerId = req.params.customerId;
  const orderDate = req.body.order_date;
  const orderReference = req.body.order_reference;
  pool
    .query("SELECT * FROM customers WHERE id=$1", [customerId])
    .then((result) => {
      if (result.rows.length <= 0) {
        return res.status(400).send("There is no customer with that ID!");
      } else {
        const query =
          "INSERT INTO orders (order_date, order_reference,customer_id) VALUES ($1, $2,$3)";
        pool
          .query(query, [orderDate, orderReference, customerId])
          .then(() => res.send("Order created!"))
          .catch((e) => console.error(e));
      }
    });
});

app.put("/customers/:customerId", (req, res) => {
  const customerId = req.params.customerId;
  const newName = req.body.name;
  const newAddress = req.body.address;
  const newCity = req.body.city;
  const newCountry = req.body.country;
  pool
    .query(
      "UPDATE customers SET name=$1,address=$2,city=$3,country=$4 WHERE id=$5",
      [newName, newAddress, newCity, newCountry, customerId]
    )
    .then(() => res.send(`Customer ${customerId} updated!`))
    .catch((e) => console.error(e));
});

app.delete("/customers/:customerId", function (req, res) {
  const customerId = req.params.customerId;
  pool
    .query("DELETE FROM orders WHERE customer_id=$1", [customerId])
    .then(() => {
      pool
        .query("DELETE FROM customers WHERE id=$1", [customerId])
        .then(() => res.send(`Customer ${customerId} deleted!`))
        .catch((e) => console.error(e));
    })
    .catch((e) => console.error(e));
});

app.delete("/orders/:orderId", function (req, res) {
  const orderId = req.params.orderId;
  pool
    .query("DELETE FROM order_items WHERE order_id=$1", [orderId])
    .then(() => {
      pool
        .query("DELETE FROM orders WHERE id=$1", [orderId])
        .then(() => res.send(`Order ${orderId} deleted!`))
        .catch((e) => console.error(e));
    })
    .catch((e) => console.error(e));
});

app.listen(5000, function () {
  console.log("Server is listening on port 5000. Ready to accept requests!");
});
