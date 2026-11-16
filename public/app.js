
const money = n => `KSh ${Number(n).toLocaleString("en-KE")}`;
let catalogue = [];
let cart = JSON.parse(localStorage.getItem("gitts-cart") || "[]");
function escapeHtml(s=""){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
function saveCart(){localStorage.setItem("gitts-cart",JSON.stringify(cart));renderCart();}
function addToCart(id){const item=cart.find(x=>x.bookId===id);if(item)item.quantity=Math.min(10,item.quantity+1);else cart.push({bookId:id,quantity:1});saveCart();document.querySelector("#cartMessage").textContent="Added to cart.";}
function removeFromCart(id){cart=cart.filter(x=>x.bookId!==id);saveCart();}
function changeQty(id,qty){const item=cart.find(x=>x.bookId===id);if(item){item.quantity=Math.max(1,Math.min(10,Number(qty)||1));saveCart();}}
function renderCart(){
 const target=document.querySelector("#cartItems");if(!target)return;
 const rows=cart.map(i=>{const b=catalogue.find(x=>x._id===i.bookId);return b?{...i,book:b}:null}).filter(Boolean);
 const total=rows.reduce((s,i)=>s+i.book.price*i.quantity,0);
 document.querySelector("#cartTotal").textContent=money(total);
 target.innerHTML=rows.length?rows.map(i=>`<div class="row" style="align-items:center;border-bottom:1px solid #26364b;padding:10px 0"><div><b>${escapeHtml(i.book.title)}</b><div class="muted">${money(i.book.price)} each</div></div><input aria-label="Quantity" type="number" min="1" max="10" value="${i.quantity}" style="max-width:75px" onchange="changeQty('${i.bookId}',this.value)"><button class="btn outline" onclick="removeFromCart('${i.bookId}')">Remove</button></div>`).join(""):"Your cart is empty.";
}
async function loadBooks() {
 const grid=document.querySelector("#booksGrid");if(!grid)return;
 try{
  catalogue=await fetch("/api/books").then(r=>r.json());
  const render=list=>grid.innerHTML=list.length?list.map(b=>`<article class="book-card"><div class="book-cover">G</div><h3>${escapeHtml(b.title)}</h3><p>${escapeHtml(b.description||b.category||"Educational resource")}</p><div class="price">${money(b.price)}</div><button class="btn" style="margin-top:12px" onclick="addToCart('${b._id}')">Add to cart</button></article>`).join(""):"<p class='muted'>No books have been published yet.</p>";
  render(catalogue);
  document.querySelector("#search")?.addEventListener("input",e=>render(catalogue.filter(b=>b.title.toLowerCase().includes(e.target.value.toLowerCase()))));
  renderCart();
 }catch{grid.innerHTML="<p class='muted'>Books are temporarily unavailable.</p>";}
}
document.querySelector("#checkoutBtn")?.addEventListener("click",async()=>{
 const msg=document.querySelector("#cartMessage");
 if(!cart.length){msg.textContent="Add at least one book first.";return;}
 const phone=document.querySelector("#checkoutPhone").value.trim();
 if(!phone){msg.textContent="Enter the M-Pesa phone number.";return;}
 try{
  const r=await fetch("/api/orders",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({items:cart,phone})});
  const d=await r.json();if(!r.ok)throw Error(d.error||"Checkout failed.");
  msg.textContent=d.message;cart=[];saveCart();
 }catch(e){msg.textContent=e.message;}
});
document.querySelector("#year")?.replaceChildren(String(new Date().getFullYear()));
loadBooks();
