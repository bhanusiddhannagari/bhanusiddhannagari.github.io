// Legacy Personal Expense Calculator (self-contained copy)
class ExpenseCalculator {
	constructor() {
		this.expenses = JSON.parse(localStorage.getItem('personal_expenses')) || [];
		this.chart = null;
		this.initializeApp();
	}
	initializeApp() {
		this.setupEventListeners();
		this.setTodayDate();
		this.displayExpenses();
		this.updateSummary();
		this.updateChart();
	}
	setupEventListeners() {
		document.getElementById('expense-form').addEventListener('submit', e => { e.preventDefault(); this.addExpense(); });
		document.getElementById('filter-category').addEventListener('change', () => this.displayExpenses());
		document.getElementById('export-btn').addEventListener('click', () => this.exportData());
		document.getElementById('clear-all-btn').addEventListener('click', () => this.clearAllExpenses());
	}
	setTodayDate() { const today = new Date().toISOString().split('T')[0]; document.getElementById('expense-date').value = today; }
	addExpense() {
		const description = document.getElementById('expense-description').value.trim();
		const amount = parseFloat(document.getElementById('expense-amount').value);
		const category = document.getElementById('expense-category').value;
		const date = document.getElementById('expense-date').value;
		if (!description || !amount || !category || !date) return this.showNotification('Please fill in all fields','error');
		if (amount <= 0) return this.showNotification('Amount must be greater than 0','error');
		const expense = { id: Date.now(), description, amount, category, date: new Date(date), createdAt: new Date() };
		this.expenses.push(expense); this.saveToStorage(); this.clearForm(); this.displayExpenses(); this.updateSummary(); this.updateChart(); this.showNotification('Expense added successfully!','success');
	}
	deleteExpense(id) {
		if (!confirm('Delete this expense?')) return;
		this.expenses = this.expenses.filter(e => e.id !== id); this.saveToStorage(); this.displayExpenses(); this.updateSummary(); this.updateChart(); this.showNotification('Expense deleted','success');
	}
	displayExpenses() {
		const filterCategory = document.getElementById('filter-category').value;
		let filtered = this.expenses;
		if (filterCategory !== 'all') filtered = filtered.filter(e => e.category === filterCategory);
		filtered.sort((a,b)=> new Date(b.date)-new Date(a.date));
		const list = document.getElementById('expense-list');
		if (filtered.length === 0) { list.innerHTML = '<div class="empty-state"><i class="fas fa-receipt"></i><p>No expenses found.</p></div>'; return; }
		list.innerHTML = filtered.map(exp => `<div class="expense-item"><div class="expense-category">${this.getCategoryIcon(exp.category)}</div><div class="expense-details"><h4>${exp.description}</h4><p>${this.formatDate(exp.date)} • ${this.getCategoryName(exp.category)}</p></div><div class="expense-amount">₹${exp.amount.toFixed(2)}</div><button class="delete-btn" onclick="calculator.deleteExpense(${exp.id})"><i class=\"fas fa-times\"></i></button></div>`).join('');
	}
	updateSummary() {
		const totalAmount = this.expenses.reduce((s,e)=>s+e.amount,0);
		const now = new Date(); const month = now.getMonth(); const year= now.getFullYear();
		const monthlyExpenses = this.expenses.filter(e=> { const d = new Date(e.date); return d.getMonth()===month && d.getFullYear()===year; });
		const monthlyAmount = monthlyExpenses.reduce((s,e)=>s+e.amount,0);
		const daysPassed = now.getDate(); const dailyAvg = daysPassed? monthlyAmount/daysPassed:0;
		document.getElementById('total-amount').textContent = `₹${totalAmount.toFixed(2)}`;
		document.getElementById('month-amount').textContent = `₹${monthlyAmount.toFixed(2)}`;
		document.getElementById('daily-average').textContent = `₹${dailyAvg.toFixed(2)}`;
	}
	updateChart() {
		const canvas = document.getElementById('expense-chart'); if (!canvas) return; const ctx = canvas.getContext('2d');
		const totals = {}; const colors = { rent:'#FF6384', groceries:'#36A2EB', utilities:'#FFCE56', transportation:'#4BC0C0', entertainment:'#9966FF', healthcare:'#FF9F40', education:'#FF6384', miscellaneous:'#C9CBCF' };
		this.expenses.forEach(e=> totals[e.category] = (totals[e.category]||0)+e.amount);
		const labels = Object.keys(totals).map(c=> this.getCategoryName(c)); const data = Object.values(totals); const bg = Object.keys(totals).map(c=> colors[c]||'#999');
		if (this.chart) this.chart.destroy();
		if (data.length===0){ ctx.clearRect(0,0,canvas.width,canvas.height); ctx.font='16px Segoe UI'; ctx.fillStyle='#666'; ctx.textAlign='center'; ctx.fillText('No data yet', canvas.width/2, canvas.height/2); return; }
		this.chart = new Chart(ctx,{ type:'doughnut', data:{ labels, datasets:[{ data, backgroundColor:bg, borderWidth:2, borderColor:'#fff'}]}, options:{ responsive:true, maintainAspectRatio:false, plugins:{ legend:{ position:'bottom', labels:{ usePointStyle:true }}, tooltip:{ callbacks:{ label:(ct)=>{ const total=ct.dataset.data.reduce((a,b)=>a+b,0); const pct=((ct.parsed/total)*100).toFixed(1); return `${ct.label}: ₹${ct.parsed.toFixed(2)} (${pct}%)`; }}}}}});
	}
	getCategoryIcon(c){ const i={ rent:'🏠', groceries:'🛒', utilities:'⚡', transportation:'🚌', entertainment:'🎬', healthcare:'🏥', education:'📚', miscellaneous:'📦'}; return i[c]||'📦'; }
	getCategoryName(c){ const n={ rent:'Rent', groceries:'Groceries', utilities:'Utilities', transportation:'Transportation', entertainment:'Entertainment', healthcare:'Healthcare', education:'Education', miscellaneous:'Miscellaneous'}; return n[c]||'Miscellaneous'; }
	formatDate(d){ return new Date(d).toLocaleDateString('en-IN',{ year:'numeric', month:'short', day:'numeric'}); }
	clearForm(){ document.getElementById('expense-form').reset(); this.setTodayDate(); }
	saveToStorage(){ localStorage.setItem('personal_expenses', JSON.stringify(this.expenses)); }
	exportData(){ if(!this.expenses.length) return this.showNotification('No data to export','error'); const csv=this.generateCSV(); const blob=new Blob([csv],{type:'text/csv'}); const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download=`personal_expenses_${new Date().toISOString().split('T')[0]}.csv`; document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url); this.showNotification('Exported CSV','success'); }
	generateCSV(){ const headers=['Date','Description','Category','Amount']; const rows=this.expenses.map(e=>[this.formatDate(e.date), e.description, this.getCategoryName(e.category), e.amount.toFixed(2)]); return [headers,...rows].map(r=> r.map(f=>`"${f}"`).join(',')).join('\n'); }
	clearAllExpenses(){ if(!this.expenses.length) return this.showNotification('No expenses to clear','error'); if(!confirm('Delete ALL expenses?')) return; this.expenses=[]; this.saveToStorage(); this.displayExpenses(); this.updateSummary(); this.updateChart(); this.showNotification('All expenses cleared','success'); }
	showNotification(msg,type){ const n=document.getElementById('notification'); n.textContent=msg; n.className=`notification ${type}`; n.classList.remove('hidden'); setTimeout(()=> n.classList.add('show'),50); setTimeout(()=> { n.classList.remove('show'); setTimeout(()=> n.classList.add('hidden'),300); },4000); }
}
let calculator; document.addEventListener('DOMContentLoaded',()=>{ calculator = new ExpenseCalculator(); });
