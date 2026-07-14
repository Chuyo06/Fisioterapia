import { reactive } from 'vue'
import { supabase } from './lib/supabaseClient'

export const store = reactive({
  isLoaded: false,
  patients: [],
  appointments: [],
  payments: [],

  async fetchAllData() {
    if (this.isLoaded) return

    const [
      { data: patData },
      { data: apptData },
      { data: payData }
    ] = await Promise.all([
      supabase.from('patients').select('*').order('first_name', { ascending: true }),
      supabase.from('appointments').select('*, patients(*)').order('appointment_date', { ascending: false }),
      supabase.from('payments').select('*, patients(first_name, last_name)').order('payment_date', { ascending: false })
    ])

    if (patData) this.patients = patData
    if (apptData) this.appointments = apptData
    if (payData) this.payments = payData

    this.isLoaded = true
  }
})
