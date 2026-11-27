
import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import './App.css'

const menuItems = [
  { name: 'Overview', icon: '📊' },
  { name: 'Books Management', icon: '📚' },
  { name: 'Students', icon: '🎓' },
  { name: 'Staff Interface', icon: '👨‍💼' },
  { name: 'Issue / Return', icon: '📖' },
  { name: 'Collections', icon: '🗂️' },
  { name: 'Notices', icon: '🔔' },
  { name: 'Library OPAC', icon: '🔍' }
]

const emptyBookForm = {
  title: '', author: '', category: '', publisher: '',
  accession_number: '', barcode_number: '',
  rating: '4.5', color: '', icon: '📚'
}

const emptyStudentForm = {
  student_id: '', name: '', email: '', mobile: '',
  course: '', year: '', category: 'UG'
}

const emptyStaffForm = {
  staff_id: '', name: '', email: '', mobile: '',
  designation: '', department: ''
}

const emptyIssueForm = {
  student_id: '', book_id: ''
}

const emptyCollectionForm = {
  name: '', description: '', category: '', shelf_location: ''
}

const emptyNoticeForm = {
  title: '', message: '', priority: 'Normal', published: true
}

const cellStyle = {
  padding: '12px',
  borderBottom: '1px solid #e2e8f0',
  whiteSpace: 'nowrap'
}

function getLocalDateString(date = new Date()) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function getDueDate(category) {
  const date = new Date()

  if (category === 'PG') {
    date.setMonth(date.getMonth() + 1)
  } else {
    date.setDate(date.getDate() + 14)
  }

  return getLocalDateString(date)
}

function formatDate(date) {
  if (!date) return '—'
  return new Date(`${date}T00:00:00`).toLocaleDateString('en-IN')
}

// BOOK DETAILS POPUP
function BookDetailsModal({ book, status, onClose }) {
  if (!book) return null

  const isIssued = status === 'Issued'

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(15, 23, 42, 0.70)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '16px',
        zIndex: 99999
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: '#ffffff',
          width: '100%',
          maxWidth: '520px',
          maxHeight: '85vh',
          overflowY: 'auto',
          borderRadius: '16px',
          padding: '25px',
          boxSizing: 'border-box',
          boxShadow: '0 15px 40px rgba(0,0,0,0.25)'
        }}
      >
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '10px'
        }}>
          <h2 style={{ margin: 0 }}>📖 Book Details</h2>

          <button
            type="button"
            onClick={onClose}
            style={{
              border: 'none',
              background: '#fee2e2',
              color: '#b91c1c',
              borderRadius: '8px',
              padding: '8px 12px',
              cursor: 'pointer'
            }}
          >
            ✕ Close
          </button>
        </div>

        <div style={{
          textAlign: 'center',
          fontSize: '55px',
          margin: '20px 0 10px'
        }}>
          {book.icon || '📚'}
        </div>

        <h2 style={{ textAlign: 'center', margin: '5px 0 20px' }}>
          {book.title || 'Untitled Book'}
        </h2>

        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr',
          gap: '12px'
        }}>
          {[
            ['Book ID', book.id],
            ['Author', book.author],
            ['Category', book.category],
            ['Publisher', book.publisher],
            ['Accession Number', book.accession_number],
            ['Barcode Number', book.barcode_number],
            ['Rating', book.rating ? `⭐ ${book.rating}` : null]
          ].map(([label, value]) => (
            <div
              key={label}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                gap: '15px',
                padding: '11px',
                background: '#f8fafc',
                borderRadius: '8px'
              }}
            >
              <strong>{label}:</strong>
              <span style={{ textAlign: 'right', overflowWrap: 'anywhere' }}>
                {value || '—'}
              </span>
            </div>
          ))}

          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '15px',
            padding: '13px',
            background: isIssued ? '#fee2e2' : '#dcfce7',
            borderRadius: '8px'
          }}>
            <strong>Availability:</strong>
            <strong style={{
              color: isIssued ? '#dc2626' : '#15803d'
            }}>
              {status === 'Loading'
                ? 'Checking...'
                : status === 'Unavailable'
                  ? 'Status unavailable'
                  : isIssued
                    ? '🔴 Issued'
                    : '🟢 Available'}
            </strong>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          style={{
            width: '100%',
            marginTop: '20px',
            padding: '12px',
            border: 'none',
            borderRadius: '8px',
            background: '#2563eb',
            color: '#ffffff',
            cursor: 'pointer'
          }}
        >
          Done
        </button>
      </div>
    </div>
  )
}

function App() {
  const [role, setRole] = useState('Admin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [session, setSession] = useState(null)
  const [activePage, setActivePage] = useState('Overview')

  // PUBLIC LIBRARY OPAC
  const [publicOpacOpen, setPublicOpacOpen] = useState(false)
  const [publicBooks, setPublicBooks] = useState([])
  const [publicBooksLoading, setPublicBooksLoading] = useState(false)
  const [publicBooksError, setPublicBooksError] = useState('')
  const [publicIssuedBookIds, setPublicIssuedBookIds] = useState([])
  const [publicAvailabilityLoading, setPublicAvailabilityLoading] = useState(false)
  const [publicAvailabilityError, setPublicAvailabilityError] = useState('')
  const [opacSearch, setOpacSearch] = useState('')
  const [opacCategory, setOpacCategory] = useState('All')
  const [selectedOpacBook, setSelectedOpacBook] = useState(null)

  // BOOKS
  const [books, setBooks] = useState([])
  const [booksLoading, setBooksLoading] = useState(false)
  const [booksError, setBooksError] = useState('')
  const [searchBook, setSearchBook] = useState('')
  const [bookForm, setBookForm] = useState(emptyBookForm)
  const [editingBook, setEditingBook] = useState(null)
  const [bookSaving, setBookSaving] = useState(false)

  // STUDENTS
  const [students, setStudents] = useState([])
  const [studentsLoading, setStudentsLoading] = useState(false)
  const [studentsError, setStudentsError] = useState('')
  const [studentForm, setStudentForm] = useState(emptyStudentForm)
  const [editingStudent, setEditingStudent] = useState(null)
  const [studentSaving, setStudentSaving] = useState(false)

  // STAFF
  const [staff, setStaff] = useState([])
  const [staffLoading, setStaffLoading] = useState(false)
  const [staffError, setStaffError] = useState('')
  const [staffForm, setStaffForm] = useState(emptyStaffForm)
  const [editingStaff, setEditingStaff] = useState(null)
  const [staffSaving, setStaffSaving] = useState(false)

  // ISSUE / RETURN
  const [issueRecords, setIssueRecords] = useState([])
  const [issuesLoading, setIssuesLoading] = useState(false)
  const [issuesError, setIssuesError] = useState('')
  const [issueForm, setIssueForm] = useState(emptyIssueForm)
  const [issueSaving, setIssueSaving] = useState(false)

  // COLLECTIONS
  const [collections, setCollections] = useState([])
  const [collectionsLoading, setCollectionsLoading] = useState(false)
  const [collectionsError, setCollectionsError] = useState('')
  const [collectionForm, setCollectionForm] = useState(emptyCollectionForm)
  const [editingCollection, setEditingCollection] = useState(null)
  const [collectionSaving, setCollectionSaving] = useState(false)

  // NOTICES
  const [notices, setNotices] = useState([])
  const [noticesLoading, setNoticesLoading] = useState(false)
  const [noticesError, setNoticesError] = useState('')
  const [noticeForm, setNoticeForm] = useState(emptyNoticeForm)
  const [editingNotice, setEditingNotice] = useState(null)
  const [noticeSaving, setNoticeSaving] = useState(false)

  // AUTHENTICATION
  useEffect(() => {
    let mounted = true

    supabase.auth.getSession().then(({ data }) => {
      if (mounted) setSession(data.session)
    })

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, newSession) => {
        setSession(newSession)
      }
    )

    return () => {
      mounted = false
      listener.subscription.unsubscribe()
    }
  }, [])

  // LOAD DATA
  useEffect(() => {
    if (session) {
      loadBooks()
      loadStudents()
      loadStaff()
      loadIssueRecords()
      loadCollections()
      loadNotices()
    }
  }, [session])

  // PUBLIC OPAC: LOAD BOOKS
  async function loadPublicBooks() {
    setPublicBooksLoading(true)
    setPublicBooksError('')

    try {
      const { data, error } = await supabase
        .from('books')
        .select(`
          id, title, author, category, color, icon,
          rating, publisher, accession_number, barcode_number
        `)
        .order('title', { ascending: true })

      if (error) throw error

      setPublicBooks(data || [])
    } catch (error) {
      setPublicBooksError(error.message || 'Books load nahi ho paayi.')
    } finally {
      setPublicBooksLoading(false)
    }
  }

  // PUBLIC OPAC: LOAD AVAILABLE / ISSUED STATUS
  async function loadPublicAvailability() {
    setPublicAvailabilityLoading(true)
    setPublicAvailabilityError('')

    try {
      const { data, error } = await supabase
        .from('public_book_availability')
        .select('book_id')

      if (error) throw error

      setPublicIssuedBookIds(
        (data || []).map(item => String(item.book_id))
      )
    } catch (error) {
      setPublicAvailabilityError(
        error.message || 'Availability status load nahi ho paaya.'
      )
    } finally {
      setPublicAvailabilityLoading(false)
    }
  }

  // PUBLIC OPAC: LOAD WHEN OPENED
  useEffect(() => {
    if (publicOpacOpen && !session) {
      loadPublicBooks()
      loadPublicAvailability()
    }
  }, [publicOpacOpen, session])

  // PUBLIC OPAC: CATEGORIES
  const opacCategories = [
    'All',
    ...new Set(
      publicBooks.map(book => book.category).filter(Boolean)
    )
  ]

  // PUBLIC OPAC: SEARCH AND FILTER
  const filteredPublicBooks = publicBooks.filter(book => {
    const search = opacSearch.trim().toLowerCase()

    const matchesSearch =
      !search ||
      (book.title || '').toLowerCase().includes(search) ||
      (book.author || '').toLowerCase().includes(search) ||
      (book.category || '').toLowerCase().includes(search) ||
      (book.publisher || '').toLowerCase().includes(search) ||
      String(book.accession_number || '').toLowerCase().includes(search) ||
      String(book.barcode_number || '').toLowerCase().includes(search)

    const matchesCategory =
      opacCategory === 'All' || book.category === opacCategory

    return matchesSearch && matchesCategory
  })

  // BOOKS: LOAD
  async function loadBooks() {
    setBooksLoading(true)
    setBooksError('')

    const { data, error } = await supabase
      .from('books')
      .select(`
        id, title, author, category, color, icon, rating,
        publisher, accession_number, barcode_number, created_at
      `)
      .order('id', { ascending: true })

    if (error) {
      setBooksError(error.message)
    } else {
      setBooks(data || [])
    }

    setBooksLoading(false)
  }

  // BOOKS: ADD / UPDATE
  async function handleBookSubmit(e) {
    e.preventDefault()
    setBooksError('')

    const bookData = {
      title: bookForm.title.trim(),
      author: bookForm.author.trim(),
      category: bookForm.category.trim(),
      publisher: bookForm.publisher.trim() || null,
      accession_number: bookForm.accession_number.trim() || null,
      barcode_number: bookForm.barcode_number.trim() || null,
      rating: bookForm.rating.trim() || '4.5',
      color: bookForm.color.trim() || null,
      icon: bookForm.icon.trim() || '📚'
    }

    if (!bookData.title || !bookData.author || !bookData.category) {
      setBooksError('Book Title, Author aur Category zaroori hain.')
      return
    }

    setBookSaving(true)

    try {
      let result

      if (editingBook !== null) {
        result = await supabase
          .from('books')
          .update(bookData)
          .eq('id', editingBook)
      } else {
        result = await supabase
          .from('books')
          .insert([bookData])
      }

      if (result.error) throw result.error

      const wasEditing = editingBook !== null
      setBookForm(emptyBookForm)
      setEditingBook(null)
      await loadBooks()

      window.alert(
        wasEditing ? 'Book successfully updated!' : 'Book successfully added!'
      )
    } catch (error) {
      if (error.code === '23505') {
        setBooksError('Accession Number ya Barcode Number pehle se use ho raha hai.')
      } else {
        setBooksError(error.message || 'Book save nahi hui.')
      }
    } finally {
      setBookSaving(false)
    }
  }

  function editBook(book) {
    setEditingBook(book.id)
    setBookForm({
      title: book.title || '',
      author: book.author || '',
      category: book.category || '',
      publisher: book.publisher || '',
      accession_number: book.accession_number || '',
      barcode_number: book.barcode_number || '',
      rating: book.rating || '4.5',
      color: book.color || '',
      icon: book.icon || '📚'
    })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function cancelBookEdit() {
    setEditingBook(null)
    setBookForm(emptyBookForm)
    setBooksError('')
  }

  async function deleteBook(id) {
    const confirmed = window.confirm(
      'Kya aap is book ko permanently delete karna chahte hain?'
    )
    if (!confirmed) return

    setBooksError('')

    const { error } = await supabase
      .from('books')
      .delete()
      .eq('id', id)

    if (error) {
      if (error.code === '23503') {
        setBooksError(
          'Ye book kisi student ko issue hui hai. Issue record manage kiye bina book delete nahi ho sakti.'
        )
      } else {
        setBooksError(error.message || 'Book delete nahi hui.')
      }
      return
    }

    if (editingBook === id) cancelBookEdit()
    await loadBooks()
  }

  // STUDENTS: LOAD
  async function loadStudents() {
    setStudentsLoading(true)
    setStudentsError('')

    const { data, error } = await supabase
      .from('students')
      .select('*')
      .order('id', { ascending: true })

    if (error) {
      setStudentsError(error.message)
    } else {
      setStudents(data || [])
    }

    setStudentsLoading(false)
  }

  async function handleStudentSubmit(e) {
    e.preventDefault()
    setStudentsError('')

    const studentData = {
      student_id: studentForm.student_id.trim(),
      name: studentForm.name.trim(),
      email: studentForm.email.trim() || null,
      mobile: studentForm.mobile.trim() || null,
      course: studentForm.course.trim() || null,
      year: studentForm.year.trim() || null,
      category: studentForm.category
    }

    if (!studentData.student_id || !studentData.name) {
      setStudentsError('Student ID aur Name zaroori hain.')
      return
    }

    setStudentSaving(true)

    try {
      let result

      if (editingStudent !== null) {
        result = await supabase
          .from('students')
          .update(studentData)
          .eq('id', editingStudent)
      } else {
        result = await supabase
          .from('students')
          .insert([studentData])
      }

      if (result.error) throw result.error

      setStudentForm(emptyStudentForm)
      setEditingStudent(null)
      await loadStudents()
    } catch (error) {
      setStudentsError(error.message || 'Student save nahi hua.')
    } finally {
      setStudentSaving(false)
    }
  }

  function editStudent(student) {
    setEditingStudent(student.id)
    setStudentForm({
      student_id: student.student_id || '',
      name: student.name || '',
      email: student.email || '',
      mobile: student.mobile || '',
      course: student.course || '',
      year: student.year || '',
      category: student.category || 'UG'
    })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function cancelStudentEdit() {
    setEditingStudent(null)
    setStudentForm(emptyStudentForm)
    setStudentsError('')
  }

  async function deleteStudent(id) {
    const confirmed = window.confirm(
      'Kya aap is student ko permanently delete karna chahte hain?'
    )
    if (!confirmed) return

    setStudentsError('')

    const { error } = await supabase
      .from('students')
      .delete()
      .eq('id', id)

    if (error) {
      setStudentsError(error.message)
      return
    }

    if (editingStudent === id) cancelStudentEdit()
    await loadStudents()
  }

  // STAFF: LOAD
  async function loadStaff() {
    setStaffLoading(true)
    setStaffError('')

    const { data, error } = await supabase
      .from('staff')
      .select('*')
      .order('id', { ascending: true })

    if (error) {
      setStaffError(error.message)
    } else {
      setStaff(data || [])
    }

    setStaffLoading(false)
  }

  async function handleStaffSubmit(e) {
    e.preventDefault()
    setStaffError('')

    const staffData = {
      staff_id: staffForm.staff_id.trim(),
      name: staffForm.name.trim(),
      email: staffForm.email.trim() || null,
      mobile: staffForm.mobile.trim() || null,
      designation: staffForm.designation.trim() || null,
      department: staffForm.department.trim() || null
    }

    if (!staffData.staff_id || !staffData.name) {
      setStaffError('Staff ID aur Name zaroori hain.')
      return
    }

    setStaffSaving(true)

    try {
      let result

      if (editingStaff !== null) {
        result = await supabase
          .from('staff')
          .update(staffData)
          .eq('id', editingStaff)
      } else {
        result = await supabase
          .from('staff')
          .insert([staffData])
      }

      if (result.error) throw result.error

      setStaffForm(emptyStaffForm)
      setEditingStaff(null)
      await loadStaff()
    } catch (error) {
      setStaffError(error.message || 'Staff save nahi hua.')
    } finally {
      setStaffSaving(false)
    }
  }

  function editStaff(member) {
    setEditingStaff(member.id)
    setStaffForm({
      staff_id: member.staff_id || '',
      name: member.name || '',
      email: member.email || '',
      mobile: member.mobile || '',
      designation: member.designation || '',
      department: member.department || ''
    })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function cancelStaffEdit() {
    setEditingStaff(null)
    setStaffForm(emptyStaffForm)
    setStaffError('')
  }

  async function deleteStaff(id) {
    const confirmed = window.confirm(
      'Kya aap is staff member ko permanently delete karna chahte hain?'
    )
    if (!confirmed) return

    setStaffError('')

    const { error } = await supabase
      .from('staff')
      .delete()
      .eq('id', id)

    if (error) {
      setStaffError(error.message)
      return
    }

    if (editingStaff === id) cancelStaffEdit()
    await loadStaff()
  }

  // ISSUE RECORDS: LOAD
  async function loadIssueRecords() {
    setIssuesLoading(true)
    setIssuesError('')

    const { data, error } = await supabase
      .from('book_issues')
      .select('*')
      .order('id', { ascending: false })

    if (error) {
      setIssuesError(error.message)
    } else {
      setIssueRecords(data || [])
    }

    setIssuesLoading(false)
  }

  // ISSUE BOOK
  async function handleIssueSubmit(e) {
    e.preventDefault()
    setIssuesError('')

    const student = students.find(
      item => item.student_id === issueForm.student_id
    )

    const book = books.find(
      item => String(item.id) === String(issueForm.book_id)
    )

    if (!student) {
      setIssuesError('Please select a valid registered student.')
      return
    }

    if (!book) {
      setIssuesError('Please select a valid book.')
      return
    }

    const activeStudentIssues = issueRecords.filter(
      record =>
        record.student_id === student.student_id &&
        record.status === 'Issued'
    )

    const maximumBooks = student.category === 'PG' ? 4 : 2

    if (activeStudentIssues.length >= maximumBooks) {
      setIssuesError(
        `${student.category} student maximum ${maximumBooks} books hi issue kar sakta hai.`
      )
      return
    }

    const alreadyIssued = issueRecords.some(
      record =>
        String(record.book_id) === String(book.id) &&
        record.status === 'Issued'
    )

    if (alreadyIssued) {
      setIssuesError('Ye book pehle se kisi student ko issue hai.')
      return
    }

    const dueDate = getDueDate(student.category)
    setIssueSaving(true)

    try {
      const { error } = await supabase
        .from('book_issues')
        .insert([{
          student_id: student.student_id,
          book_id: book.id,
          issue_date: getLocalDateString(),
          due_date: dueDate,
          status: 'Issued'
        }])

      if (error) throw error

      setIssueForm(emptyIssueForm)
      await loadIssueRecords()
      await loadPublicAvailability()

      window.alert(
        `Book successfully issued!\nStudent: ${student.name}\nBook: ${book.title}\nDue Date: ${formatDate(dueDate)}`
      )
    } catch (error) {
      setIssuesError(error.message || 'Book issue nahi hui.')
    } finally {
      setIssueSaving(false)
    }
  }

  // RETURN BOOK
  async function returnBook(record) {
    const confirmed = window.confirm(
      'Kya aap is book ko returned mark karna chahte hain?'
    )
    if (!confirmed) return

    setIssuesError('')

    const { error } = await supabase
      .from('book_issues')
      .update({
        status: 'Returned',
        return_date: getLocalDateString()
      })
      .eq('id', record.id)
      .eq('status', 'Issued')

    if (error) {
      setIssuesError(error.message)
      return
    }

    await loadIssueRecords()
    await loadPublicAvailability()
  }

  // COLLECTIONS: LOAD
  async function loadCollections() {
    setCollectionsLoading(true)
    setCollectionsError('')

    try {
      const { data, error } = await supabase
        .from('collections')
        .select('*')
        .order('id', { ascending: false })

      if (error) throw error
      setCollections(data || [])
    } catch (error) {
      setCollectionsError(error.message || 'Collections load nahi hui.')
    } finally {
      setCollectionsLoading(false)
    }
  }

  // COLLECTIONS: ADD / UPDATE
  async function handleCollectionSubmit(e) {
    e.preventDefault()
    setCollectionsError('')

    const collectionData = {
      name: collectionForm.name.trim(),
      description: collectionForm.description.trim() || null,
      category: collectionForm.category.trim() || null,
      shelf_location: collectionForm.shelf_location.trim() || null
    }

    if (!collectionData.name) {
      setCollectionsError('Collection name zaroori hai.')
      return
    }

    setCollectionSaving(true)

    try {
      let result

      if (editingCollection !== null) {
        result = await supabase
          .from('collections')
          .update(collectionData)
          .eq('id', editingCollection)
      } else {
        result = await supabase
          .from('collections')
          .insert([collectionData])
      }

      if (result.error) throw result.error

      const wasEditing = editingCollection !== null
      setCollectionForm(emptyCollectionForm)
      setEditingCollection(null)
      await loadCollections()

      window.alert(
        wasEditing
          ? 'Collection successfully updated!'
          : 'Collection successfully added!'
      )
    } catch (error) {
      setCollectionsError(error.message || 'Collection save nahi hui.')
    } finally {
      setCollectionSaving(false)
    }
  }

  function editCollection(item) {
    setEditingCollection(item.id)
    setCollectionForm({
      name: item.name || '',
      description: item.description || '',
      category: item.category || '',
      shelf_location: item.shelf_location || ''
    })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function cancelCollectionEdit() {
    setEditingCollection(null)
    setCollectionForm(emptyCollectionForm)
    setCollectionsError('')
  }

  async function deleteCollection(id) {
    if (!window.confirm('Kya aap is collection ko delete karna chahte hain?')) {
      return
    }

    setCollectionsError('')

    const { error } = await supabase
      .from('collections')
      .delete()
      .eq('id', id)

    if (error) {
      setCollectionsError(error.message)
      return
    }

    if (editingCollection === id) cancelCollectionEdit()
    await loadCollections()
  }

  // NOTICES: LOAD
  async function loadNotices() {
    setNoticesLoading(true)
    setNoticesError('')

    try {
      const { data, error } = await supabase
        .from('notices')
        .select('*')
        .order('id', { ascending: false })

      if (error) throw error
      setNotices(data || [])
    } catch (error) {
      setNoticesError(error.message || 'Notices load nahi hui.')
    } finally {
      setNoticesLoading(false)
    }
  }

  // NOTICES: ADD / UPDATE
  async function handleNoticeSubmit(e) {
    e.preventDefault()
    setNoticesError('')

    const noticeData = {
      title: noticeForm.title.trim(),
      message: noticeForm.message.trim(),
      priority: noticeForm.priority,
      published: noticeForm.published
    }

    if (!noticeData.title || !noticeData.message) {
      setNoticesError('Notice title aur message zaroori hain.')
      return
    }

    setNoticeSaving(true)

    try {
      let result

      if (editingNotice !== null) {
        result = await supabase
          .from('notices')
          .update(noticeData)
          .eq('id', editingNotice)
      } else {
        result = await supabase
          .from('notices')
          .insert([noticeData])
      }

      if (result.error) throw result.error

      const wasEditing = editingNotice !== null
      setNoticeForm(emptyNoticeForm)
      setEditingNotice(null)
      await loadNotices()

      window.alert(
        wasEditing ? 'Notice successfully updated!' : 'Notice successfully added!'
      )
    } catch (error) {
      setNoticesError(error.message || 'Notice save nahi hui.')
    } finally {
      setNoticeSaving(false)
    }
  }

  function editNotice(item) {
    setEditingNotice(item.id)
    setNoticeForm({
      title: item.title || '',
      message: item.message || '',
      priority: item.priority || 'Normal',
      published: item.published ?? true
    })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function cancelNoticeEdit() {
    setEditingNotice(null)
    setNoticeForm(emptyNoticeForm)
    setNoticesError('')
  }

  async function deleteNotice(id) {
    if (!window.confirm('Kya aap is notice ko permanently delete karna chahte hain?')) {
      return
    }

    setNoticesError('')

    const { error } = await supabase
      .from('notices')
      .delete()
      .eq('id', id)

    if (error) {
      setNoticesError(error.message)
      return
    }

    if (editingNotice === id) cancelNoticeEdit()
    await loadNotices()
  }

  // LOGIN
  async function handleLogin(e) {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password
      })

      if (error) throw error
    } catch (error) {
      setMessage(error.message || 'Login failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // FORGOT PASSWORD
  async function handleForgotPassword() {
    if (!email.trim()) {
      setMessage('Please enter your email address first.')
      return
    }

    setLoading(true)
    setMessage('')

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(
        email.trim(),
        { redirectTo: window.location.origin }
      )

      if (error) throw error
      setMessage('Password reset email sent. Please check your inbox.')
    } catch (error) {
      setMessage(error.message || 'Unable to send reset email.')
    } finally {
      setLoading(false)
    }
  }

  // LOGOUT
  async function handleLogout() {
    const { error } = await supabase.auth.signOut()

    if (error) {
      setMessage(error.message)
    } else {
      setSession(null)
      setActivePage('Overview')

      setBooks([])
      setStudents([])
      setStaff([])
      setIssueRecords([])
      setCollections([])
      setNotices([])

      setBookForm(emptyBookForm)
      setStudentForm(emptyStudentForm)
      setStaffForm(emptyStaffForm)
      setIssueForm(emptyIssueForm)
      setCollectionForm(emptyCollectionForm)
      setNoticeForm(emptyNoticeForm)

      setEditingBook(null)
      setEditingStudent(null)
      setEditingStaff(null)
      setEditingCollection(null)
      setEditingNotice(null)

      setSelectedOpacBook(null)
    }
  }

  // SEARCH BOOKS
  const filteredBooks = books.filter(book => {
    const search = searchBook.toLowerCase()

    return (
      (book.title || '').toLowerCase().includes(search) ||
      (book.author || '').toLowerCase().includes(search) ||
      (book.category || '').toLowerCase().includes(search) ||
      String(book.accession_number || '').toLowerCase().includes(search) ||
      String(book.barcode_number || '').toLowerCase().includes(search)
    )
  })

  // ADMIN OPAC: SEARCH AND FILTER
  const filteredOpacBooks = books.filter(book => {
    const search = opacSearch.trim().toLowerCase()

    const matchesSearch =
      !search ||
      (book.title || '').toLowerCase().includes(search) ||
      (book.author || '').toLowerCase().includes(search) ||
      (book.category || '').toLowerCase().includes(search) ||
      (book.publisher || '').toLowerCase().includes(search) ||
      String(book.accession_number || '').toLowerCase().includes(search) ||
      String(book.barcode_number || '').toLowerCase().includes(search)

    const matchesCategory =
      opacCategory === 'All' || book.category === opacCategory

    return matchesSearch && matchesCategory
  })

  const adminOpacCategories = [
    'All',
    ...new Set(books.map(book => book.category).filter(Boolean))
  ]

  const activeIssues = issueRecords.filter(
    record => record.status === 'Issued'
  )

  function getAdminBookStatus(book) {
    return activeIssues.some(
      record => String(record.book_id) === String(book.id)
    ) ? 'Issued' : 'Available'
  }

  function getPublicBookStatus(book) {
    if (publicAvailabilityLoading) return 'Loading'
    if (publicAvailabilityError) return 'Unavailable'

    return publicIssuedBookIds.includes(String(book.id))
      ? 'Issued'
      : 'Available'
  }

  // PUBLIC OPAC PAGE
  if (!session && publicOpacOpen) {
    return (
      <div className="login-page">
        <div
          className="dashboard-panel"
          style={{
            width: 'min(1100px, 94%)',
            margin: '25px auto',
            padding: '25px',
            boxSizing: 'border-box'
          }}
        >
          <BookDetailsModal
            book={selectedOpacBook}
            status={selectedOpacBook ? getPublicBookStatus(selectedOpacBook) : ''}
            onClose={() => setSelectedOpacBook(null)}
          />

          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '12px'
          }}>
            <div>
              <h1>🔍 Library OPAC</h1>
              <p>Search and explore books in our university library.</p>
            </div>

            <button
              type="button"
              onClick={() => {
                setPublicOpacOpen(false)
                setOpacSearch('')
                setOpacCategory('All')
                setSelectedOpacBook(null)
              }}
            >
              ↩ Back to Login
            </button>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '12px',
            margin: '22px 0'
          }}>
            <input
              type="search"
              placeholder="Search book, author, publisher, barcode..."
              value={opacSearch}
              onChange={e => setOpacSearch(e.target.value)}
              style={{
                padding: '13px',
                borderRadius: '8px',
                boxSizing: 'border-box'
              }}
            />

            <select
              value={opacCategory}
              onChange={e => setOpacCategory(e.target.value)}
              style={{ padding: '13px', borderRadius: '8px' }}
            >
              {opacCategories.map(category => (
                <option key={category} value={category}>
                  {category === 'All' ? 'All Categories' : category}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={() => {
                loadPublicBooks()
                loadPublicAvailability()
              }}
              disabled={publicBooksLoading || publicAvailabilityLoading}
            >
              {publicBooksLoading || publicAvailabilityLoading
                ? 'Loading...'
                : '↻ Refresh Books'}
            </button>
          </div>

          {publicBooksError && (
            <div style={{
              padding: '12px',
              color: '#b91c1c',
              background: '#fee2e2',
              borderRadius: '8px',
              marginBottom: '15px'
            }}>
              {publicBooksError}
            </div>
          )}

          {publicAvailabilityError && (
            <div style={{
              padding: '12px',
              color: '#92400e',
              background: '#fef3c7',
              borderRadius: '8px',
              marginBottom: '15px'
            }}>
              Availability status load nahi ho paaya. Supabase view aur permissions check karein.
            </div>
          )}

          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '10px'
          }}>
            <h3>📚 Library Books</h3>
            <strong>{filteredPublicBooks.length} Books Found</strong>
          </div>

          {publicBooksLoading ? (
            <p>Loading books from library...</p>
          ) : (
            <>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))',
                gap: '16px',
                marginTop: '18px'
              }}>
                {filteredPublicBooks.map(book => {
                  const status = getPublicBookStatus(book)
                  const isIssued = status === 'Issued'

                  return (
                    <div key={book.id} style={{
                      padding: '18px',
                      border: '1px solid #e2e8f0',
                      borderRadius: '12px',
                      background: '#ffffff',
                      boxShadow: '0 3px 12px rgba(0,0,0,0.05)'
                    }}>
                      <div style={{
                        fontSize: '35px',
                        marginBottom: '10px'
                      }}>
                        {book.icon || '📚'}
                      </div>

                      <h3 style={{ margin: '5px 0 10px' }}>
                        {book.title}
                      </h3>

                      <p><strong>Author:</strong> {book.author || '—'}</p>
                      <p><strong>Category:</strong> {book.category || '—'}</p>

                      <p>
                        <strong>Status:</strong>{' '}
                        <span style={{
                          color: status === 'Loading'
                            ? '#64748b'
                            : status === 'Unavailable'
                              ? '#92400e'
                              : isIssued ? '#dc2626' : '#15803d',
                          fontWeight: 'bold'
                        }}>
                          {status === 'Loading'
                            ? 'Checking...'
                            : status === 'Unavailable'
                              ? 'Unavailable'
                              : isIssued ? '🔴 Issued' : '🟢 Available'}
                        </span>
                      </p>

                      {book.rating && <p>⭐ {book.rating}</p>}

                      <button
                        type="button"
                        onClick={() => setSelectedOpacBook(book)}
                        style={{
                          width: '100%',
                          padding: '11px',
                          marginTop: '10px',
                          border: 'none',
                          borderRadius: '8px',
                          background: '#2563eb',
                          color: '#ffffff',
                          cursor: 'pointer'
                        }}
                      >
                        📖 View Details
                      </button>
                    </div>
                  )
                })}
              </div>

              {filteredPublicBooks.length === 0 && (
                <p style={{
                  textAlign: 'center',
                  padding: '30px'
                }}>
                  {publicBooks.length === 0
                    ? 'No books are currently available in the library.'
                    : 'No books found. Try another search or category.'}
                </p>
              )}
            </>
          )}

          <p style={{
            textAlign: 'center',
            color: '#64748b',
            marginTop: '30px'
          }}>
            © 2026 Smart Library Management System
          </p>
        </div>
      </div>
    )
  }

  // DASHBOARD
  if (session) {
    return (
      <div className="dashboard">
        <aside className="dashboard-sidebar">
          <div className="dashboard-brand">
            <div className="dashboard-logo">📚</div>
            <div>
              <h2>Smart Library</h2>
              <span>MANAGEMENT SYSTEM</span>
            </div>
          </div>

          <div className="sidebar-label">MAIN MENU</div>

          <nav className="dashboard-nav">
            {menuItems.map(item => (
              <button
                key={item.name}
                className={activePage === item.name ? 'nav-item active' : 'nav-item'}
                onClick={() => setActivePage(item.name)}
              >
                <span>{item.icon}</span>
                {item.name}
              </button>
            ))}
          </nav>

          <div className="sidebar-bottom">
            <div className="user-mini">
              <div className="user-avatar">👤</div>
              <div>
                <strong>{role}</strong>
                <small>{session.user.email}</small>
              </div>
            </div>

            <button className="logout-button" onClick={handleLogout}>
              ↪ Logout
            </button>
          </div>
        </aside>

        <main className="dashboard-main">
          <header className="dashboard-topbar">
            <div>
              <h1>{activePage}</h1>
              <p>University Library Management System</p>
            </div>

            <div className="topbar-user">
              <span>🔔</span>
              <span>👤</span>
              <strong>{role}</strong>
            </div>
          </header>

          {/* OVERVIEW */}
          {activePage === 'Overview' && (
            <>
              <section className="dashboard-welcome">
                <div>
                  <span>LIBRARY ADMINISTRATION</span>
                  <h2>Welcome to Smart Library</h2>
                  <p>
                    Manage books, students and library activities
                    from one place.
                  </p>
                </div>
                <div className="welcome-book">📚</div>
              </section>

              <section className="dashboard-stats">
                <div className="stat-card">
                  <span>📚</span>
                  <p>Total Books</p>
                  <h2>{books.length}</h2>
                  <small>Books in database</small>
                </div>

                <div className="stat-card">
                  <span>🎓</span>
                  <p>Registered Students</p>
                  <h2>{students.length}</h2>
                  <small>Registered students in database</small>
                </div>

                <div className="stat-card">
                  <span>👨‍💼</span>
                  <p>Registered Staff</p>
                  <h2>{staff.length}</h2>
                  <small>Staff in database</small>
                </div>

                <div className="stat-card">
                  <span>📖</span>
                  <p>Books Issued</p>
                  <h2>{activeIssues.length}</h2>
                  <small>Currently issued books</small>
                </div>
              </section>

              <section className="dashboard-content-grid">
                <div className="dashboard-panel">
                  <h3>Library Operations</h3>
                  <p>Choose a section to manage library activities.</p>

                  <div className="quick-actions">
                    {menuItems.slice(1).map(item => (
                      <button
                        key={item.name}
                        onClick={() => setActivePage(item.name)}
                      >
                        <span>{item.icon}</span>
                        {item.name}
                        <b>→</b>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="dashboard-panel">
                  <h3>University Borrowing Rules</h3>

                  <div className="rule-row">
                    <strong>UG Students</strong>
                    <span>2 Books / 14 Days</span>
                  </div>

                  <div className="rule-row">
                    <strong>PG Students</strong>
                    <span>4 Books / 1 Month</span>
                  </div>

                  <div className="rule-note">
                    These are the borrowing rules provided in your
                    university requirements.
                  </div>
                </div>
              </section>
            </>
          )}

          {/* BOOKS MANAGEMENT */}
          {activePage === 'Books Management' && (
            <section className="dashboard-panel" style={{ overflowX: 'auto' }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '12px',
                marginBottom: '18px'
              }}>
                <div>
                  <h2 style={{ margin: 0 }}>📚 Books Management</h2>
                  <p style={{ marginBottom: 0 }}>
                    Add, edit and manage books in your Supabase database.
                  </p>
                </div>
                <strong>Total Books: {books.length}</strong>
              </div>

              {booksError && (
                <div style={{
                  padding: '12px', margin: '15px 0',
                  color: '#b91c1c', background: '#fee2e2',
                  borderRadius: '8px'
                }}>
                  {booksError}
                </div>
              )}

              <div style={{
                padding: '18px', background: '#f8fafc',
                border: '1px solid #e2e8f0', borderRadius: '10px',
                marginBottom: '22px'
              }}>
                <h3 style={{ marginTop: 0 }}>
                  {editingBook !== null ? '✏️ Edit Book' : '➕ Add New Book'}
                </h3>

                <form onSubmit={handleBookSubmit} style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                  gap: '12px'
                }}>
                  <input placeholder="Book Title *" value={bookForm.title}
                    onChange={e => setBookForm({ ...bookForm, title: e.target.value })} required />
                  <input placeholder="Author Name *" value={bookForm.author}
                    onChange={e => setBookForm({ ...bookForm, author: e.target.value })} required />
                  <input placeholder="Category *" value={bookForm.category}
                    onChange={e => setBookForm({ ...bookForm, category: e.target.value })} required />
                  <input placeholder="Publisher" value={bookForm.publisher}
                    onChange={e => setBookForm({ ...bookForm, publisher: e.target.value })} />
                  <input placeholder="Accession Number" value={bookForm.accession_number}
                    onChange={e => setBookForm({ ...bookForm, accession_number: e.target.value })} />
                  <input placeholder="Barcode Number" value={bookForm.barcode_number}
                    onChange={e => setBookForm({ ...bookForm, barcode_number: e.target.value })} />
                  <input type="number" min="0" max="5" step="0.1"
                    placeholder="Rating" value={bookForm.rating}
                    onChange={e => setBookForm({ ...bookForm, rating: e.target.value })} />
                  <input placeholder="Book Icon (e.g. 📚)" value={bookForm.icon}
                    onChange={e => setBookForm({ ...bookForm, icon: e.target.value })} />
                  <input placeholder="Color (optional)" value={bookForm.color}
                    onChange={e => setBookForm({ ...bookForm, color: e.target.value })} />

                  <button type="submit" className="login-submit" disabled={bookSaving}>
                    {bookSaving ? 'Please wait...' : editingBook !== null ? 'Update Book' : 'Add Book'}
                  </button>

                  {editingBook !== null && (
                    <button type="button" onClick={cancelBookEdit}>Cancel Edit</button>
                  )}
                </form>
              </div>

              <div style={{
                display: 'flex', gap: '10px', flexWrap: 'wrap',
                marginBottom: '18px'
              }}>
                <input type="search"
                  placeholder="Search title, author, category or barcode..."
                  value={searchBook}
                  onChange={e => setSearchBook(e.target.value)}
                  style={{
                    flex: 1, minWidth: '220px', padding: '12px',
                    border: '1px solid #ddd', borderRadius: '8px',
                    boxSizing: 'border-box'
                  }}
                />
                <button type="button" onClick={loadBooks} disabled={booksLoading}>
                  {booksLoading ? 'Loading...' : '↻ Refresh'}
                </button>
              </div>

              {booksLoading ? (
                <p>Loading books from Supabase...</p>
              ) : (
                <>
                  <p>Showing {filteredBooks.length} of {books.length} books</p>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{
                      width: '100%', minWidth: '1150px',
                      borderCollapse: 'collapse', textAlign: 'left'
                    }}>
                      <thead>
                        <tr style={{ background: '#f1f5f9' }}>
                          {['ID', 'Book', 'Author', 'Category', 'Publisher',
                            'Accession Number', 'Barcode Number', 'Rating', 'Actions'
                          ].map(heading => (
                            <th key={heading} style={{
                              padding: '13px', borderBottom: '1px solid #ddd',
                              whiteSpace: 'nowrap'
                            }}>{heading}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {filteredBooks.map(book => (
                          <tr key={book.id}>
                            <td style={cellStyle}>{book.id}</td>
                            <td style={cellStyle}><span>{book.icon || '📚'} </span><strong>{book.title}</strong></td>
                            <td style={cellStyle}>{book.author}</td>
                            <td style={cellStyle}>{book.category}</td>
                            <td style={cellStyle}>{book.publisher || '—'}</td>
                            <td style={cellStyle}>{book.accession_number || '—'}</td>
                            <td style={cellStyle}>{book.barcode_number || '—'}</td>
                            <td style={cellStyle}>{book.rating ? `⭐ ${book.rating}` : '—'}</td>
                            <td style={cellStyle}>
                              <button type="button" onClick={() => editBook(book)}>Edit</button>{' '}
                              <button type="button" onClick={() => deleteBook(book.id)} style={{ color: 'red' }}>Delete</button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {filteredBooks.length === 0 && (
                    <p style={{ textAlign: 'center', padding: '25px' }}>
                      No books found. Add your first book using the form above.
                    </p>
                  )}
                </>
              )}
            </section>
          )}

          {/* STUDENTS MANAGEMENT */}
          {activePage === 'Students' && (
            <section className="dashboard-panel">
              <div style={{
                display: 'flex', justifyContent: 'space-between',
                alignItems: 'center', flexWrap: 'wrap', gap: '12px'
              }}>
                <div>
                  <h2>🎓 Students Management</h2>
                  <p>Register and manage university students.</p>
                </div>
                <strong>Total Students: {students.length}</strong>
              </div>

              {studentsError && (
                <div style={{
                  padding: '12px', margin: '15px 0',
                  color: '#b91c1c', background: '#fee2e2',
                  borderRadius: '8px'
                }}>{studentsError}</div>
              )}

              <form onSubmit={handleStudentSubmit} style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: '12px', margin: '20px 0'
              }}>
                <input placeholder="Student ID *" value={studentForm.student_id}
                  onChange={e => setStudentForm({ ...studentForm, student_id: e.target.value })} required />
                <input placeholder="Student Name *" value={studentForm.name}
                  onChange={e => setStudentForm({ ...studentForm, name: e.target.value })} required />
                <input type="email" placeholder="Email Address" value={studentForm.email}
                  onChange={e => setStudentForm({ ...studentForm, email: e.target.value })} />
                <input type="tel" placeholder="Mobile Number" value={studentForm.mobile}
                  onChange={e => setStudentForm({ ...studentForm, mobile: e.target.value })} />
                <input placeholder="Course" value={studentForm.course}
                  onChange={e => setStudentForm({ ...studentForm, course: e.target.value })} />
                <input placeholder="Year / Semester" value={studentForm.year}
                  onChange={e => setStudentForm({ ...studentForm, year: e.target.value })} />
                <select value={studentForm.category}
                  onChange={e => setStudentForm({ ...studentForm, category: e.target.value })}>
                  <option value="UG">UG Student</option>
                  <option value="PG">PG Student</option>
                </select>
                <button type="submit" className="login-submit" disabled={studentSaving}>
                  {studentSaving ? 'Please wait...' : editingStudent !== null ? 'Update Student' : 'Register Student'}
                </button>
                {editingStudent !== null && (
                  <button type="button" onClick={cancelStudentEdit}>Cancel Edit</button>
                )}
              </form>

              <div style={{
                display: 'flex', justifyContent: 'space-between',
                alignItems: 'center', flexWrap: 'wrap', gap: '10px',
                margin: '20px 0'
              }}>
                <h3>Registered Students</h3>
                <button type="button" onClick={loadStudents} disabled={studentsLoading}>
                  {studentsLoading ? 'Loading...' : '↻ Refresh'}
                </button>
              </div>

              {studentsLoading ? <p>Loading students from Supabase...</p> : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{
                    width: '100%', minWidth: '900px',
                    borderCollapse: 'collapse', textAlign: 'left'
                  }}>
                    <thead>
                      <tr style={{ background: '#f1f5f9' }}>
                        {['Student ID', 'Name', 'Email', 'Mobile', 'Course', 'Year', 'Category', 'Actions'].map(item => (
                          <th key={item} style={cellStyle}>{item}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {students.map(student => (
                        <tr key={student.id}>
                          <td style={cellStyle}>{student.student_id}</td>
                          <td style={cellStyle}>{student.name}</td>
                          <td style={cellStyle}>{student.email || '—'}</td>
                          <td style={cellStyle}>{student.mobile || '—'}</td>
                          <td style={cellStyle}>{student.course || '—'}</td>
                          <td style={cellStyle}>{student.year || '—'}</td>
                          <td style={cellStyle}>{student.category || '—'}</td>
                          <td style={cellStyle}>
                            <button type="button" onClick={() => editStudent(student)}>Edit</button>{' '}
                            <button type="button" onClick={() => deleteStudent(student.id)} style={{ color: 'red' }}>Delete</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {students.length === 0 && (
                    <p style={{ textAlign: 'center', padding: '25px' }}>
                      No students registered yet. Register your first student above.
                    </p>
                  )}
                </div>
              )}
            </section>
          )}

          {/* STAFF MANAGEMENT */}
          {activePage === 'Staff Interface' && (
            <section className="dashboard-panel">
              <div style={{
                display: 'flex', justifyContent: 'space-between',
                alignItems: 'center', flexWrap: 'wrap', gap: '12px'
              }}>
                <div>
                  <h2>👨‍💼 Staff Management</h2>
                  <p>Register and manage university library staff.</p>
                </div>
                <strong>Total Staff: {staff.length}</strong>
              </div>

              {staffError && (
                <div style={{
                  padding: '12px', margin: '15px 0',
                  color: '#b91c1c', background: '#fee2e2',
                  borderRadius: '8px'
                }}>{staffError}</div>
              )}

              <form onSubmit={handleStaffSubmit} style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: '12px', margin: '20px 0'
              }}>
                <input placeholder="Staff ID *" value={staffForm.staff_id}
                  onChange={e => setStaffForm({ ...staffForm, staff_id: e.target.value })} required />
                <input placeholder="Staff Name *" value={staffForm.name}
                  onChange={e => setStaffForm({ ...staffForm, name: e.target.value })} required />
                <input type="email" placeholder="Email Address" value={staffForm.email}
                  onChange={e => setStaffForm({ ...staffForm, email: e.target.value })} />
                <input type="tel" placeholder="Mobile Number" value={staffForm.mobile}
                  onChange={e => setStaffForm({ ...staffForm, mobile: e.target.value })} />
                <input placeholder="Designation" value={staffForm.designation}
                  onChange={e => setStaffForm({ ...staffForm, designation: e.target.value })} />
                <input placeholder="Department" value={staffForm.department}
                  onChange={e => setStaffForm({ ...staffForm, department: e.target.value })} />
                <button type="submit" className="login-submit" disabled={staffSaving}>
                  {staffSaving ? 'Please wait...' : editingStaff !== null ? 'Update Staff' : 'Register Staff'}
                </button>
                {editingStaff !== null && (
                  <button type="button" onClick={cancelStaffEdit}>Cancel Edit</button>
                )}
              </form>

              <div style={{
                display: 'flex', justifyContent: 'space-between',
                alignItems: 'center', flexWrap: 'wrap', gap: '10px',
                margin: '20px 0'
              }}>
                <h3>Registered Staff</h3>
                <button type="button" onClick={loadStaff} disabled={staffLoading}>
                  {staffLoading ? 'Loading...' : '↻ Refresh'}
                </button>
              </div>

              {staffLoading ? <p>Loading staff from Supabase...</p> : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{
                    width: '100%', minWidth: '900px',
                    borderCollapse: 'collapse', textAlign: 'left'
                  }}>
                    <thead>
                      <tr style={{ background: '#f1f5f9' }}>
                        {['Staff ID', 'Name', 'Email', 'Mobile', 'Designation', 'Department', 'Actions'].map(item => (
                          <th key={item} style={cellStyle}>{item}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {staff.map(member => (
                        <tr key={member.id}>
                          <td style={cellStyle}>{member.staff_id}</td>
                          <td style={cellStyle}>{member.name}</td>
                          <td style={cellStyle}>{member.email || '—'}</td>
                          <td style={cellStyle}>{member.mobile || '—'}</td>
                          <td style={cellStyle}>{member.designation || '—'}</td>
                          <td style={cellStyle}>{member.department || '—'}</td>
                          <td style={cellStyle}>
                            <button type="button" onClick={() => editStaff(member)}>Edit</button>{' '}
                            <button type="button" onClick={() => deleteStaff(member.id)} style={{ color: 'red' }}>Delete</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {staff.length === 0 && (
                    <p style={{ textAlign: 'center', padding: '25px' }}>
                      No staff registered yet. Register your first staff member above.
                    </p>
                  )}
                </div>
              )}
            </section>
          )}

          {/* ISSUE / RETURN */}
          {activePage === 'Issue / Return' && (
            <section className="dashboard-panel">
              <div style={{
                display: 'flex', justifyContent: 'space-between',
                alignItems: 'center', flexWrap: 'wrap', gap: '12px'
              }}>
                <div>
                  <h2>📖 Book Issue / Return</h2>
                  <p>Issue books to registered students and manage returns.</p>
                </div>
                <strong>Currently Issued: {activeIssues.length}</strong>
              </div>

              <div className="dashboard-stats" style={{ margin: '20px 0' }}>
                <div className="stat-card">
                  <span>📖</span><p>Currently Issued</p><h2>{activeIssues.length}</h2>
                </div>
                <div className="stat-card">
                  <span>↩️</span><p>Returned Books</p>
                  <h2>{issueRecords.filter(r => r.status === 'Returned').length}</h2>
                </div>
                <div className="stat-card">
                  <span>📚</span><p>Total Issue Records</p><h2>{issueRecords.length}</h2>
                </div>
              </div>

              {issuesError && (
                <div style={{
                  padding: '12px', margin: '15px 0',
                  color: '#b91c1c', background: '#fee2e2',
                  borderRadius: '8px'
                }}>{issuesError}</div>
              )}

              <div style={{
                padding: '18px', background: '#f8fafc',
                border: '1px solid #e2e8f0', borderRadius: '10px',
                margin: '20px 0'
              }}>
                <h3 style={{ marginTop: 0 }}>📚 Issue a Book</h3>

                <form onSubmit={handleIssueSubmit} style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                  gap: '12px'
                }}>
                  <select value={issueForm.student_id}
                    onChange={e => setIssueForm({ ...issueForm, student_id: e.target.value })} required>
                    <option value="">Select Student *</option>
                    {students.map(student => (
                      <option key={student.id} value={student.student_id}>
                        {student.student_id} — {student.name} ({student.category})
                      </option>
                    ))}
                  </select>

                  <select value={issueForm.book_id}
                    onChange={e => setIssueForm({ ...issueForm, book_id: e.target.value })} required>
                    <option value="">Select Book *</option>
                    {books.filter(book => !activeIssues.some(
                      record => String(record.book_id) === String(book.id)
                    )).map(book => (
                      <option key={book.id} value={book.id}>
                        {book.title} — {book.author}
                      </option>
                    ))}
                  </select>

                  <button type="submit" className="login-submit"
                    disabled={issueSaving || students.length === 0 || books.length === 0}>
                    {issueSaving ? 'Please wait...' : 'Issue Book'}
                  </button>
                </form>

                <p style={{ fontSize: '13px', color: '#64748b', marginBottom: 0 }}>
                  UG: Maximum 2 books for 14 days. PG: Maximum 4 books for 1 month.
                </p>

                {students.length === 0 && (
                  <p style={{ color: '#b91c1c' }}>
                    Pehle Students section mein student register karo.
                  </p>
                )}
                {books.length === 0 && (
                  <p style={{ color: '#b91c1c' }}>
                    Books database mein abhi koi book nahi hai. Issue karne ke liye pehle book add honi chahiye.
                  </p>
                )}
              </div>

              <div style={{
                display: 'flex', justifyContent: 'space-between',
                alignItems: 'center', flexWrap: 'wrap', gap: '10px',
                margin: '25px 0 15px'
              }}>
                <h3>Issue / Return Records</h3>
                <button type="button" onClick={loadIssueRecords} disabled={issuesLoading}>
                  {issuesLoading ? 'Loading...' : '↻ Refresh'}
                </button>
              </div>

              {issuesLoading ? <p>Loading issue records...</p> : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{
                    width: '100%', minWidth: '1050px',
                    borderCollapse: 'collapse', textAlign: 'left'
                  }}>
                    <thead>
                      <tr style={{ background: '#f1f5f9' }}>
                        {['Student ID', 'Student Name', 'Book', 'Issue Date',
                          'Due Date', 'Return Date', 'Status', 'Action'
                        ].map(item => (
                          <th key={item} style={cellStyle}>{item}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {issueRecords.map(record => {
                        const student = students.find(s => s.student_id === record.student_id)
                        const book = books.find(b => String(b.id) === String(record.book_id))
                        const overdue =
                          record.status === 'Issued' &&
                          record.due_date < getLocalDateString()

                        return (
                          <tr key={record.id}>
                            <td style={cellStyle}>{record.student_id}</td>
                            <td style={cellStyle}>{student?.name || '—'}</td>
                            <td style={cellStyle}>{book?.title || `Book ID ${record.book_id}`}</td>
                            <td style={cellStyle}>{formatDate(record.issue_date)}</td>
                            <td style={cellStyle}>{formatDate(record.due_date)}</td>
                            <td style={cellStyle}>{formatDate(record.return_date)}</td>
                            <td style={cellStyle}>
                              {record.status === 'Returned'
                                ? <span style={{ color: 'green' }}>Returned</span>
                                : overdue
                                  ? <span style={{ color: 'red' }}>Overdue</span>
                                  : <span style={{ color: '#2563eb' }}>Issued</span>}
                            </td>
                            <td style={cellStyle}>
                              {record.status === 'Issued'
                                ? <button type="button" onClick={() => returnBook(record)}>Return Book</button>
                                : '—'}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>

                  {issueRecords.length === 0 && (
                    <p style={{ textAlign: 'center', padding: '25px' }}>
                      No issue records found. Issue your first book above.
                    </p>
                  )}
                </div>
              )}
            </section>
          )}

          {/* COLLECTIONS MANAGEMENT */}
          {activePage === 'Collections' && (
            <section className="dashboard-panel" style={{ overflowX: 'auto' }}>
              <div style={{
                display: 'flex', justifyContent: 'space-between',
                alignItems: 'center', flexWrap: 'wrap', gap: '12px'
              }}>
                <div>
                  <h2>🗂️ Collections Management</h2>
                  <p>Create and manage library collections.</p>
                </div>
                <strong>Total Collections: {collections.length}</strong>
              </div>

              {collectionsError && (
                <div style={{
                  padding: '12px', margin: '15px 0',
                  color: '#b91c1c', background: '#fee2e2',
                  borderRadius: '8px'
                }}>{collectionsError}</div>
              )}

              <div style={{
                padding: '18px', background: '#f8fafc',
                border: '1px solid #e2e8f0', borderRadius: '10px',
                margin: '20px 0'
              }}>
                <h3>{editingCollection !== null ? '✏️ Edit Collection' : '➕ Add New Collection'}</h3>

                <form onSubmit={handleCollectionSubmit} style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                  gap: '12px'
                }}>
                  <input placeholder="Collection Name *"
                    value={collectionForm.name}
                    onChange={e => setCollectionForm({ ...collectionForm, name: e.target.value })}
                    required />

                  <input placeholder="Category"
                    value={collectionForm.category}
                    onChange={e => setCollectionForm({ ...collectionForm, category: e.target.value })} />

                  <input placeholder="Shelf Location"
                    value={collectionForm.shelf_location}
                    onChange={e => setCollectionForm({ ...collectionForm, shelf_location: e.target.value })} />

                  <textarea placeholder="Collection Description"
                    value={collectionForm.description}
                    onChange={e => setCollectionForm({ ...collectionForm, description: e.target.value })}
                    rows="3"
                    style={{
                      padding: '12px', border: '1px solid #ddd',
                      borderRadius: '8px', fontFamily: 'inherit'
                    }} />

                  <button type="submit" className="login-submit" disabled={collectionSaving}>
                    {collectionSaving
                      ? 'Please wait...'
                      : editingCollection !== null ? 'Update Collection' : 'Add Collection'}
                  </button>

                  {editingCollection !== null && (
                    <button type="button" onClick={cancelCollectionEdit}>Cancel Edit</button>
                  )}
                </form>
              </div>

              <div style={{
                display: 'flex', justifyContent: 'space-between',
                alignItems: 'center', flexWrap: 'wrap', gap: '10px',
                margin: '20px 0'
              }}>
                <h3>Library Collections</h3>
                <button type="button" onClick={loadCollections} disabled={collectionsLoading}>
                  {collectionsLoading ? 'Loading...' : '↻ Refresh'}
                </button>
              </div>

              {collectionsLoading ? <p>Loading collections from Supabase...</p> : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{
                    width: '100%', minWidth: '850px',
                    borderCollapse: 'collapse', textAlign: 'left'
                  }}>
                    <thead>
                      <tr style={{ background: '#f1f5f9' }}>
                        {['ID', 'Collection Name', 'Description', 'Category', 'Shelf Location', 'Actions'].map(item => (
                          <th key={item} style={cellStyle}>{item}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {collections.map(item => (
                        <tr key={item.id}>
                          <td style={cellStyle}>{item.id}</td>
                          <td style={cellStyle}><strong>{item.name}</strong></td>
                          <td style={{
                            ...cellStyle, whiteSpace: 'normal', maxWidth: '250px'
                          }}>{item.description || '—'}</td>
                          <td style={cellStyle}>{item.category || '—'}</td>
                          <td style={cellStyle}>{item.shelf_location || '—'}</td>
                          <td style={cellStyle}>
                            <button type="button" onClick={() => editCollection(item)}>Edit</button>{' '}
                            <button type="button" onClick={() => deleteCollection(item.id)} style={{ color: 'red' }}>Delete</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {collections.length === 0 && (
                    <p style={{ textAlign: 'center', padding: '25px' }}>
                      No collections found. Add your first collection above.
                    </p>
                  )}
                </div>
              )}
            </section>
          )}

          {/* NOTICES MANAGEMENT */}
          {activePage === 'Notices' && (
            <section className="dashboard-panel" style={{ overflowX: 'auto' }}>
              <div style={{
                display: 'flex', justifyContent: 'space-between',
                alignItems: 'center', flexWrap: 'wrap', gap: '12px'
              }}>
                <div>
                  <h2>🔔 Notices Management</h2>
                  <p>Create and publish library announcements.</p>
                </div>
                <strong>Total Notices: {notices.length}</strong>
              </div>

              {noticesError && (
                <div style={{
                  padding: '12px', margin: '15px 0',
                  color: '#b91c1c', background: '#fee2e2',
                  borderRadius: '8px'
                }}>{noticesError}</div>
              )}

              <div style={{
                padding: '18px', background: '#f8fafc',
                border: '1px solid #e2e8f0', borderRadius: '10px',
                margin: '20px 0'
              }}>
                <h3>{editingNotice !== null ? '✏️ Edit Notice' : '➕ Create New Notice'}</h3>

                <form onSubmit={handleNoticeSubmit} style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                  gap: '12px'
                }}>
                  <input placeholder="Notice Title *"
                    value={noticeForm.title}
                    onChange={e => setNoticeForm({ ...noticeForm, title: e.target.value })}
                    required />

                  <select value={noticeForm.priority}
                    onChange={e => setNoticeForm({ ...noticeForm, priority: e.target.value })}>
                    <option value="Normal">Normal Priority</option>
                    <option value="Important">Important</option>
                    <option value="Urgent">Urgent</option>
                  </select>

                  <textarea placeholder="Write notice message *"
                    value={noticeForm.message}
                    onChange={e => setNoticeForm({ ...noticeForm, message: e.target.value })}
                    rows="4"
                    required
                    style={{
                      gridColumn: '1 / -1',
                      padding: '12px', border: '1px solid #ddd',
                      borderRadius: '8px', fontFamily: 'inherit'
                    }} />

                  <label style={{
                    display: 'flex', alignItems: 'center', gap: '8px'
                  }}>
                    <input type="checkbox"
                      checked={noticeForm.published}
                      onChange={e => setNoticeForm({
                        ...noticeForm, published: e.target.checked
                      })} />
                    Publish this notice
                  </label>

                  <button type="submit" className="login-submit" disabled={noticeSaving}>
                    {noticeSaving
                      ? 'Please wait...'
                      : editingNotice !== null ? 'Update Notice' : 'Save Notice'}
                  </button>

                  {editingNotice !== null && (
                    <button type="button" onClick={cancelNoticeEdit}>Cancel Edit</button>
                  )}
                </form>
              </div>

              <div style={{
                display: 'flex', justifyContent: 'space-between',
                alignItems: 'center', flexWrap: 'wrap', gap: '10px',
                margin: '20px 0'
              }}>
                <h3>All Notices</h3>
                <button type="button" onClick={loadNotices} disabled={noticesLoading}>
                  {noticesLoading ? 'Loading...' : '↻ Refresh'}
                </button>
              </div>

              {noticesLoading ? <p>Loading notices from Supabase...</p> : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{
                    width: '100%', minWidth: '950px',
                    borderCollapse: 'collapse', textAlign: 'left'
                  }}>
                    <thead>
                      <tr style={{ background: '#f1f5f9' }}>
                        {['ID', 'Title', 'Message', 'Priority', 'Status', 'Created At', 'Actions'].map(item => (
                          <th key={item} style={cellStyle}>{item}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {notices.map(item => (
                        <tr key={item.id}>
                          <td style={cellStyle}>{item.id}</td>
                          <td style={cellStyle}><strong>{item.title}</strong></td>
                          <td style={{
                            ...cellStyle, whiteSpace: 'normal', maxWidth: '280px'
                          }}>{item.message}</td>
                          <td style={cellStyle}>
                            <span style={{
                              color: item.priority === 'Urgent'
                                ? '#dc2626'
                                : item.priority === 'Important'
                                  ? '#d97706' : '#2563eb',
                              fontWeight: '600'
                            }}>{item.priority}</span>
                          </td>
                          <td style={cellStyle}>
                            {item.published
                              ? <span style={{ color: 'green' }}>Published</span>
                              : <span style={{ color: '#64748b' }}>Draft</span>}
                          </td>
                          <td style={cellStyle}>
                            {item.created_at
                              ? new Date(item.created_at).toLocaleDateString('en-IN')
                              : '—'}
                          </td>
                          <td style={cellStyle}>
                            <button type="button" onClick={() => editNotice(item)}>Edit</button>{' '}
                            <button type="button" onClick={() => deleteNotice(item.id)} style={{ color: 'red' }}>Delete</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {notices.length === 0 && (
                    <p style={{ textAlign: 'center', padding: '25px' }}>
                      No notices found. Create your first notice above.
                    </p>
                  )}
                </div>
              )}
            </section>
          )}

          {/* LIBRARY OPAC - ADMIN */}
          {activePage === 'Library OPAC' && (
            <section className="dashboard-panel" style={{ overflowX: 'auto' }}>
              <BookDetailsModal
                book={selectedOpacBook}
                status={selectedOpacBook ? getAdminBookStatus(selectedOpacBook) : ''}
                onClose={() => setSelectedOpacBook(null)}
              />

              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '12px'
              }}>
                <div>
                  <h2>🔍 Library OPAC</h2>
                  <p>Browse and search books available in your library.</p>
                </div>
                <strong>{filteredOpacBooks.length} Books Found</strong>
              </div>

              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: '12px',
                margin: '20px 0'
              }}>
                <input
                  type="search"
                  placeholder="Search title, author, publisher, barcode..."
                  value={opacSearch}
                  onChange={e => setOpacSearch(e.target.value)}
                />

                <select
                  value={opacCategory}
                  onChange={e => setOpacCategory(e.target.value)}
                >
                  {adminOpacCategories.map(category => (
                    <option key={category} value={category}>
                      {category === 'All' ? 'All Categories' : category}
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={() => {
                    loadBooks()
                    loadIssueRecords()
                  }}
                  disabled={booksLoading || issuesLoading}
                >
                  {booksLoading || issuesLoading ? 'Loading...' : '↻ Refresh Books'}
                </button>
              </div>

              {booksError && (
                <p style={{ color: 'red' }}>{booksError}</p>
              )}

              {booksLoading || issuesLoading ? (
                <p>Loading books and availability...</p>
              ) : (
                <>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))',
                    gap: '16px'
                  }}>
                    {filteredOpacBooks.map(book => {
                      const status = getAdminBookStatus(book)
                      const isIssued = status === 'Issued'

                      return (
                        <div key={book.id} style={{
                          border: '1px solid #e2e8f0',
                          padding: '18px',
                          borderRadius: '12px',
                          background: '#fff'
                        }}>
                          <div style={{ fontSize: '35px' }}>
                            {book.icon || '📚'}
                          </div>

                          <h3>{book.title}</h3>
                          <p><strong>Author:</strong> {book.author || '—'}</p>
                          <p><strong>Category:</strong> {book.category || '—'}</p>

                          <p>
                            <strong>Status:</strong>{' '}
                            <span style={{
                              color: isIssued ? '#dc2626' : '#15803d',
                              fontWeight: 'bold'
                            }}>
                              {isIssued ? '🔴 Issued' : '🟢 Available'}
                            </span>
                          </p>

                          {book.rating && <p>⭐ {book.rating}</p>}

                          <button
                            type="button"
                            onClick={() => setSelectedOpacBook(book)}
                            style={{
                              width: '100%',
                              padding: '11px',
                              marginTop: '10px',
                              border: 'none',
                              borderRadius: '8px',
                              background: '#2563eb',
                              color: '#ffffff',
                              cursor: 'pointer'
                            }}
                          >
                            📖 View Details
                          </button>
                        </div>
                      )
                    })}
                  </div>

                  {filteredOpacBooks.length === 0 && (
                    <p style={{ textAlign: 'center', padding: '25px' }}>
                      {books.length === 0
                        ? 'No books are currently available in the library.'
                        : 'No books found. Try another search or category.'}
                    </p>
                  )}
                </>
              )}
            </section>
          )}

          <footer className="dashboard-footer">
            © 2026 Smart Library Management System · University Library
          </footer>
        </main>
      </div>
    )
  }

  // LOGIN PAGE
  return (
    <div className="login-page">
      <div className="login-brand">
        <div className="login-logo">📚</div>
        <h2>Smart Library</h2>
        <span>MANAGEMENT SYSTEM</span>
      </div>

      {/* PUBLIC OPAC BUTTON */}
      <div style={{
        textAlign: 'center',
        margin: '10px 0 20px'
      }}>
        <button
          type="button"
          onClick={() => {
            setPublicOpacOpen(true)
            setOpacSearch('')
            setOpacCategory('All')
          }}
          style={{
            padding: '11px 20px',
            borderRadius: '8px',
            cursor: 'pointer'
          }}
        >
          🔍 Browse Library Books Without Login
        </button>
      </div>

      <div className="login-layout">
        <section className="login-welcome">
          <span className="welcome-label">
            WELCOME TO YOUR DIGITAL LIBRARY
          </span>

          <h1>Knowledge is the key to a brighter future.</h1>

          <p>
            Discover books, manage your library and explore
            a smarter learning experience.
          </p>

          <div className="login-illustration">📚</div>

          <div className="feature-points">
            <span>✓ Smart Book Management</span>
            <span>✓ Easy Issue & Return</span>
            <span>✓ One Platform, All Devices</span>
          </div>
        </section>

        <section className="login-card">
          <div className="login-heading">
            <span>ACCOUNT LOGIN</span>
            <h2>Welcome Back!</h2>
            <p>Please sign in to continue.</p>
          </div>

          <label className="role-label">SELECT YOUR ROLE</label>

          <div className="role-selector">
            {['Admin', 'Staff', 'Student'].map(item => (
              <button
                key={item}
                type="button"
                className={role === item ? 'role-option selected' : 'role-option'}
                onClick={() => setRole(item)}
              >
                {item === 'Admin' ? '🛡️' : item === 'Staff' ? '👨‍💼' : '🎓'}
                <span>{item}</span>
              </button>
            ))}
          </div>

          <form onSubmit={handleLogin}>
            <label>Email Address</label>
            <input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />

            <label>Password</label>

            <div className="password-field">
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter your password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
              />

              <button type="button" onClick={() => setShowPassword(!showPassword)}>
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>

            <div className="login-options">
              <label>
                <input type="checkbox" defaultChecked />
                Remember me
              </label>

              <a
                href="#forgot"
                onClick={e => {
                  e.preventDefault()
                  handleForgotPassword()
                }}
              >
                Forgot password?
              </a>
            </div>

            <button className="login-submit" type="submit" disabled={loading}>
              {loading ? 'Please wait...' : `Sign In as ${role} →`}
            </button>
          </form>

          {message && (
            <p role="status" className="login-message">{message}</p>
          )}

          <div className="login-footer">
            Secure Library Access · Smart Library System
          </div>
        </section>
      </div>

      <footer className="login-bottom">
        © 2026 Smart Library Management System
      </footer>
    </div>
  )
}

export default App
