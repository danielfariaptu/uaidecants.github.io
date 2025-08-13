// Lista de perfumes de exemplo
const products = [
  { name: "Perfume A", price: 25 },
  { name: "Perfume B", price: 30 },
  { name: "Perfume C", price: 20 }
];

const productList = document.getElementById("product-list");
const totalSpan = document.getElementById("total");
let quantities = {};

function renderProducts() {
  products.forEach((p, index) => {
    const row = document.createElement("tr");

    row.innerHTML = `
      <td>${p.name}</td>
      <td>${p.price.toFixed(2)}</td>
      <td>
        <input type="number" min="0" value="0" data-index="${index}" class="qty-input">
      </td>
    `;

    productList.appendChild(row);
  });
}

function updateTotal() {
  let total = 0;
  document.querySelectorAll(".qty-input").forEach(input => {
    const qty = parseInt(input.value) || 0;
    const index = input.dataset.index;
    total += qty * products[index].price;
    quantities[products[index].name] = qty;
  });
  totalSpan.textContent = total.toFixed(2);
}

function showSummary() {
  let summary = "";
  let total = 0;
  for (let name in quantities) {
    if (quantities[name] > 0) {
      const product = products.find(p => p.name === name);
      const subtotal = product.price * quantities[name];
      summary += `${name} - ${quantities[name]}x - R$ ${subtotal.toFixed(2)}\n`;
      total += subtotal;
    }
  }
  summary += `\nTOTAL: R$ ${total.toFixed(2)}`;
  document.getElementById("order-summary").textContent = summary;

  // Link de pagamento (substituir pelo seu)
  document.getElementById("payment-link").href = "https://seu-link-de-pagamento.com";

  document.getElementById("summary-modal").style.display = "block";
}

document.addEventListener("input", e => {
  if (e.target.classList.contains("qty-input")) {
    updateTotal();
  }
});

document.getElementById("checkout").addEventListener("click", showSummary);
document.querySelector(".close").addEventListener("click", () => {
  document.getElementById("summary-modal").style.display = "none";
});

renderProducts();
