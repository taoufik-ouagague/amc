import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Machine, Booking } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'

export default function UserDashboard() {
  const [machines, setMachines] = useState<Machine[]>([])
  const [bookings, setBookings] = useState<Booking[]>([])
  const [showBookingForm, setShowBookingForm] = useState(false)
  const [selectedMachine, setSelectedMachine] = useState<Machine | null>(null)
  const [bookingForm, setBookingForm] = useState({
    start_time: '',
    end_time: ''
  })
  const [loading, setLoading] = useState(true)
  const { user, signOut } = useAuth()

  useEffect(() => {
    fetchMachines()
    fetchUserBookings()
  }, [user])

  const fetchMachines = async () => {
    const { data, error } = await supabase
      .from('machines')
      .select('*')
      .order('name')
    
    if (error) {
      console.error('Error fetching machines:', error)
    } else {
      setMachines(data || [])
    }
    setLoading(false)
  }

  const fetchUserBookings = async () => {
    if (!user) return

    const { data, error } = await supabase
      .from('bookings')
      .select(`
        *,
        machines (name)
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
    
    if (error) {
      console.error('Error fetching bookings:', error)
    } else {
      setBookings(data || [])
    }
  }

  const handleBookMachine = (machine: Machine) => {
    setSelectedMachine(machine)
    setShowBookingForm(true)
  }

  const handleSubmitBooking = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedMachine || !user) return

    // Validate that end time is after start time
    if (new Date(bookingForm.end_time) <= new Date(bookingForm.start_time)) {
      alert('End time must be after start time')
      return
    }

    const { error } = await supabase
      .from('bookings')
      .insert([{
        user_id: user.id,
        machine_id: selectedMachine.id,
        start_time: bookingForm.start_time,
        end_time: bookingForm.end_time,
        status: 'pending'
      }])
    
    if (error) {
      alert('Error creating booking: ' + error.message)
    } else {
      setShowBookingForm(false)
      setSelectedMachine(null)
      setBookingForm({ start_time: '', end_time: '' })
      fetchUserBookings()
      alert('Booking request submitted! Please wait for admin approval.')
    }
  }

  const cancelBooking = async (bookingId: string) => {
    if (!confirm('Are you sure you want to cancel this booking?')) return

    const { error } = await supabase
      .from('bookings')
      .update({ status: 'cancelled' })
      .eq('id', bookingId)
    
    if (error) {
      alert('Error cancelling booking: ' + error.message)
    } else {
      fetchUserBookings()
    }
  }

  if (loading) {
    return <div className="flex justify-center items-center h-64">Loading...</div>
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Machine Booking</h1>
          <p className="text-gray-600">Welcome, {user?.email}</p>
        </div>
        <button
          onClick={() => signOut()}
          className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
        >
          Sign Out
        </button>
      </div>

      {/* Available Machines */}
      <div className="mb-8">
        <h2 className="text-2xl font-semibold text-gray-800 mb-4">Available Machines</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {machines.map((machine) => (
            <div key={machine.id} className="bg-white p-6 rounded-lg shadow border">
              <h3 className="font-semibold text-lg mb-2">{machine.name}</h3>
              <p className="text-gray-600 mb-4">{machine.description}</p>
              <button
                onClick={() => handleBookMachine(machine)}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Book This Machine
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* User's Bookings */}
      <div>
        <h2 className="text-2xl font-semibold text-gray-800 mb-4">My Bookings</h2>
        {bookings.length === 0 ? (
          <div className="bg-white p-6 rounded-lg shadow text-center text-gray-500">
            You haven't made any bookings yet.
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Machine
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Start Time
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    End Time
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {bookings.map((booking) => (
                  <tr key={booking.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {booking.machines?.name || 'Unknown Machine'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(booking.start_time).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(booking.end_time).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        booking.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                        booking.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {booking.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      {booking.status === 'pending' && (
                        <button
                          onClick={() => cancelBooking(booking.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          Cancel
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Booking Form Modal */}
      {showBookingForm && selectedMachine && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-6 rounded-lg shadow-lg w-96">
            <h3 className="text-lg font-semibold mb-4">Book {selectedMachine.name}</h3>
            <form onSubmit={handleSubmitBooking}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Start Time
                </label>
                <input
                  type="datetime-local"
                  required
                  value={bookingForm.start_time}
                  onChange={(e) => setBookingForm({ ...bookingForm, start_time: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  End Time
                </label>
                <input
                  type="datetime-local"
                  required
                  value={bookingForm.end_time}
                  onChange={(e) => setBookingForm({ ...bookingForm, end_time: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div className="flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowBookingForm(false)
                    setSelectedMachine(null)
                    setBookingForm({ start_time: '', end_time: '' })
                  }}
                  className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Submit Booking
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}