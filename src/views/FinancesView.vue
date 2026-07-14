<script setup>
import { ref, computed } from 'vue'
import { supabase } from '../lib/supabaseClient'
import { DollarSign, Plus, ChevronLeft, ChevronRight } from '@lucide/vue'
import { store } from '../store'

const showForm = ref(false)

const form = ref({
  patient_id: '',
  amount: '',
  payment_method: 'cash'
})

// Selector de Mes
const currentDate = ref(new Date())
const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']

const currentMonthName = computed(() => monthNames[currentDate.value.getMonth()])
const currentYear = computed(() => currentDate.value.getFullYear())

function prevMonth() { currentDate.value = new Date(currentDate.value.getFullYear(), currentDate.value.getMonth() - 1, 1) }
function nextMonth() { currentDate.value = new Date(currentDate.value.getFullYear(), currentDate.value.getMonth() + 1, 1) }

const patients = computed(() => store.patients)

const payments = computed(() => {
  const year = currentDate.value.getFullYear()
  const month = currentDate.value.getMonth()
  const startOfMonth = new Date(year, month, 1).getTime()
  const endOfMonth = new Date(year, month + 1, 0, 23, 59, 59).getTime()
  
  return store.payments.filter(pay => {
    const time = new Date(pay.payment_date).getTime()
    return time >= startOfMonth && time <= endOfMonth
  })
})

async function savePayment() {
  if (!form.value.patient_id || !form.value.amount) {
    alert("Completa paciente y monto")
    return
  }

  const { data, error } = await supabase
    .from('payments')
    .insert([{
      patient_id: form.value.patient_id,
      amount: parseFloat(form.value.amount),
      payment_method: form.value.payment_method
    }])
    .select('*, patients(first_name, last_name)')

  if (error) {
    console.error('Error saving payment:', error)
    alert('Error al registrar pago.')
  } else {
    store.payments.unshift(data[0])
    
    form.value = { patient_id: '', amount: '', payment_method: 'cash' }
    showForm.value = false
  }
}

function formatDate(isoString) {
  const date = new Date(isoString)
  return date.toLocaleDateString([], { day: 'numeric', month: 'short' })
}

// El total del mes ahora es simplemente la suma de los pagos obtenidos de la base de datos (que ya vienen filtrados por mes)
const currentMonthTotal = computed(() => {
  return payments.value.reduce((sum, p) => sum + Number(p.amount), 0)
})
</script>

<template>
  <div>
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
      <div>
        <h1 class="title" style="margin-bottom: 0;">Finanzas</h1>
        <p class="subtitle" style="margin-bottom: 0;">Control de ingresos</p>
      </div>
      <button v-if="!showForm" @click="showForm = true" class="btn-primary" style="padding: 0.5rem 1rem; border-radius: 999px;">
        <Plus :size="18" />
        Ingreso
      </button>
    </div>
    
    <!-- Filtro de Mes -->
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
      <button @click="prevMonth" class="icon-btn"><ChevronLeft /></button>
      <h2 style="font-size: 1.1rem; font-weight: 700; text-transform: capitalize;">{{ currentMonthName }} {{ currentYear }}</h2>
      <button @click="nextMonth" class="icon-btn"><ChevronRight /></button>
    </div>

    <!-- Tarjeta de Total Mensual -->
    <div class="card" style="background: linear-gradient(135deg, hsl(var(--color-primary)), hsl(var(--color-primary-dark))); color: white; border: none; margin-bottom: 1.5rem;">
      <h3 style="font-size: 0.9rem; opacity: 0.9; margin-bottom: 0.25rem;">Total Ingresos de {{ currentMonthName }}</h3>
      <div style="font-size: 2.5rem; font-weight: 700; letter-spacing: -1px;">
        ${{ currentMonthTotal.toFixed(2) }}
      </div>
    </div>
    
    <!-- Formulario de Pago (Ingreso Manual) -->
    <div v-if="showForm" class="card" style="border: 2px solid var(--color-success);">
      <h3 style="margin-bottom: 1rem; font-weight: 600;">Registrar Ingreso Manual</h3>
      <form @submit.prevent="savePayment">
        <div class="input-group">
          <label class="input-label">Paciente *</label>
          <select v-model="form.patient_id" class="input-field" required>
            <option value="" disabled>Selecciona un paciente</option>
            <option v-for="pat in patients" :key="pat.id" :value="pat.id">
              {{ pat.first_name }} {{ pat.last_name }}
            </option>
          </select>
        </div>
        
        <div style="display: flex; gap: 1rem;">
          <div class="input-group" style="flex: 1;">
            <label class="input-label">Monto ($) *</label>
            <input v-model="form.amount" type="number" step="0.01" min="0" class="input-field" required placeholder="0.00">
          </div>
          <div class="input-group" style="flex: 1;">
            <label class="input-label">Método</label>
            <select v-model="form.payment_method" class="input-field">
              <option value="cash">Efectivo</option>
              <option value="transfer">Transferencia</option>
              <option value="card">Tarjeta</option>
              <option value="other">Otro</option>
            </select>
          </div>
        </div>

        <div style="display: flex; gap: 1rem; margin-top: 0.5rem;">
          <button type="button" @click="showForm = false" class="input-field" style="flex: 1; text-align: center; cursor: pointer;">Cancelar</button>
          <button type="submit" class="btn-primary" style="flex: 1; background-color: var(--color-success);" :disabled="patients.length === 0">Guardar</button>
        </div>
      </form>
    </div>

    <!-- Lista de Pagos -->
    <h3 style="font-size: 1.1rem; font-weight: 600; margin-bottom: 1rem;">Detalle de Ingresos</h3>
    <div v-if="!store.isLoaded" style="text-align: center; padding: 2rem;">
      Cargando...
    </div>
    <div v-else-if="payments.length === 0 && !showForm" class="card">
      <p style="color: var(--color-text-muted); text-align: center; padding: 2rem 0;">
        No hay ingresos registrados en {{ currentMonthName }}.
      </p>
    </div>
    <div v-else class="payments-list">
      <div v-for="pay in payments" :key="pay.id" class="card" style="display: flex; justify-content: space-between; align-items: center; padding: 1rem; margin-bottom: 0.5rem;">
        <div>
          <div style="font-weight: 600;">
            {{ pay.patients?.first_name }} {{ pay.patients?.last_name }}
          </div>
          <div style="color: var(--color-text-muted); font-size: 0.85rem; margin-top: 0.25rem;">
            {{ formatDate(pay.payment_date) }} • {{ pay.payment_method === 'cash' ? 'Efectivo' : (pay.payment_method === 'transfer' ? 'Transferencia' : 'Tarjeta') }}
          </div>
        </div>
        <div style="font-weight: 700; font-size: 1.25rem; color: var(--color-success);">
          +${{ Number(pay.amount).toFixed(2) }}
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.icon-btn { background: none; border: none; color: hsl(var(--color-text)); cursor: pointer; padding: 0.5rem; border-radius: 50%; transition: background-color var(--transition-fast); display: flex; align-items: center; justify-content: center; }
.icon-btn:hover { background-color: hsl(var(--color-text) / 0.05); }
</style>
