import { createRouter, createWebHistory } from 'vue-router'
import AgendaView from '../views/AgendaView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'agenda',
      component: AgendaView
    },
    {
      path: '/finances',
      name: 'finances',
      component: () => import('../views/FinancesView.vue')
    },
    {
      path: '/patients',
      name: 'patients',
      component: () => import('../views/PatientsView.vue')
    }
  ]
})

const routeTitles = {
  agenda: 'Agenda',
  finances: 'Finanzas',
  patients: 'Pacientes'
}

router.afterEach((to) => {
  const pageName = routeTitles[to.name] || ''
  document.title = pageName ? `Fisioterapia | ${pageName}` : 'Fisioterapia'
})

export default router
