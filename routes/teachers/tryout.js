var express = require('express')
var router = express.Router()
const tryout = require('../../models/tryoutModel')
const uploudPhoto = require('../../config/middleware/uploudPhoto')
const deleteQuestionImage = require('../../config/middleware/deleteQuestionImage')
const deleteOldImageIfReplaced = require('../../config/middleware/deleteOldImageIfReplaced')
const { verifyToken, authorize } = require('../../config/middleware/jwt')

//menampilakn judul tryout, soal yang sudah dibuat dan status
router.get('/teacher/tryout', verifyToken, authorize(['teacher']), async (req, res, next) => {
    try {
        let  dataTryout = await tryout.getall()
        
        res.status(200).json ({ dataTryout })

    } catch (error) {
        res.status(500).json({ message: error.message })
    }
})

//post judl tryout
router.post('/teacher/tryout/create', verifyToken, authorize(['teacher']), async (req, res, next) => {
    let { tryout_name } = req.body
    let data = { tryout_name }

    if (!tryout_name) return res.status(400).json({ message: 'tryout_name is required.' })

    try {
        await tryout.store(data)
        res.status(201).json ({ message: 'CREATED'})
    } catch (error) {
        res.status(500).json ({ message: error.message })
    }
})

//edit judul tryout
router.patch('/teacher/tryout/update/:id', verifyToken, authorize(['teacher']), async (req, res, next) => {
    let id = req.params.id
    let { tryout_name } = req.body
    let data = { tryout_name }

    if (!tryout_name) return res.status(400).json({ message: 'tryout_name is required.' })

    try {
        await tryout.update(id, data)
        res.status(200).json ({ message: 'OK'})
    } catch (error) {
        res.status(500).json ({ message: error.message})
    }
})

//delete tryout byid
router.delete('/teacher/tryout/delete/:id', verifyToken, authorize(['teacher']), async (req, res, next) => {
    let id = req.params.id
    try {
        await tryout.delete(id)
        res.status(200).json ({ message: 'OK'})
    } catch (error) {
        res.status(500).json ({ message: error.message})
    }
})

//menampilkan kategori subjek beserta nama subejek dan soal yang sudah di buat
router.get('/teacher/tryout/:id', verifyToken, authorize(['teacher']), async (req, res, next) => {
    let tryoutId = req.params.id
    try {
        let tryoutData = await tryout.getTryoutQuestionById(tryoutId)

        res.status(200).json ( tryoutData )
    } catch (error) {
        res.status(500).json ({ message: error.message })
    }
})

router.patch('/teacher/tryout/:id/update_status', verifyToken, authorize(['teacher']), async (req,res,next) => {
    let { status } = req.body
    let data = { status }
    let tryoutId = req.params.id

    if (!status) return res.status(400).json({ message: 'status is required.' })

    try {
        await tryout.updateStatus(data, tryoutId)
        res.status(200).json ({ message: 'OK' })
    } catch (error) {
        res.status(500).json ({ message: error.message})
    }
})

//get soal, opsi jawaban, jawaban benar, pembahasan
router.get('/teacher/tryout/:tryoutId/:subjectId', verifyToken, authorize(['teacher']), async (req, res, next) => {
    let { tryoutId, subjectId } = req.params

    try {
        let tryoutQuestionBySubject = await tryout.getAllTryoutQuestionBySubject(tryoutId, subjectId)
        let subject = await tryout.getSubjectByIdSubject(subjectId)
        res.status(200).json({ subject, tryoutQuestionBySubject })
    } catch (error) {
        res.status(500).json ({ message: error.message })
    }
})

//post soal dan opsi soal
router.post('/teacher/tryout/:tryout_id/:subject_id/create_question', verifyToken, authorize(['teacher']), uploudPhoto.single('question_image'), async (req, res, next) => {
  try {
    const { tryout_id, subject_id } = req.params
    let { question, score, answer_options } = req.body

    if (!question) return res.status(400).json({ message: 'question is required.' })
    if (!score) return res.status(400).json({ message: 'score is required.' })

    if (!Array.isArray(answer_options)) {
      answer_options = [answer_options]
    }

    req.session.tempQuestionData = { question, score, answer_options, question_image: req.file ? req.file.filename : null }

    res.status(201).json({ message: "CREATED TO SESSION" })
  } catch (error) {
    next(error)
  }
})

//post jawaban benar dan pembahasan 
router.post('/teacher/tryout/:tryout_id/:subject_id/create_question/create_explanation', verifyToken, authorize(['teacher']), async (req, res, next) => {
  const { tryout_id, subject_id } = req.params

  let { correct_answer_index, question_explanation } = req.body

  if (!correct_answer_index) return res.status(400).json({ message: 'correct_answer_index is required.' })

  if (typeof correct_answer_index === "undefined") {
    return res.status(400).json({ message: "Indeks jawaban benar tidak valid." })
  }

  correct_answer_index = parseInt(correct_answer_index, 10)

  if (isNaN(correct_answer_index) || correct_answer_index < 0) {
    return res.status(400).json({ message: "Indeks jawaban benar tidak valid." })
  }

  if (
    typeof question_explanation === "undefined" ||
    question_explanation.trim() === ""
  ) {
    return res.status(400).json({ message: "Pembahasan soal tidak boleh kosong." })
  }

  if (!req.session || !req.session.tempQuestionData) {
    return res.status(400).json({ message: "Data soal sementara tidak ditemukan, mohon mulai dari awal." })
  }

  const tempData = req.session.tempQuestionData
  const finalData = { tryout_id, subject_id, question: tempData.question, question_image: tempData.question_image, score: tempData.score, answer_options: tempData.answer_options, correct_answer_index, question_explanation: question_explanation.trim() }


  try {
    await tryout.storeQuestionWithExplanation(finalData)
    req.session.tempQuestionData = null
    res.status(201).json({ message: "OK" })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

// patch question and answer options
router.patch('/teacher/tryout/:tryout_id/:subject_id/edit_question/:question_id',verifyToken,authorize(['teacher']),uploudPhoto.single('question_image'),deleteOldImageIfReplaced,async (req, res, next) => {
    try {
      const { tryout_id, subject_id, question_id } = req.params
      let { question, score, answer_options } = req.body
      if (!question) return res.status(400).json({ message: 'question is required.' })
      if (!score) return res.status(400).json({ message: 'score is required.' })

      if (!Array.isArray(answer_options)) {
        answer_options = [answer_options]
      }

      const question_image = req.file ? req.file.filename : null

      req.session.tempQuestionData = {question,score,answer_options,question_image}

      res.status(200).json({ message: "CREATED TO SESSION" })
    } catch (error) {
      next(error)
    }
  }
)

// patch answer explanation and correct answer
router.patch('/teacher/tryout/:tryout_id/:subject_id/edit_question/:question_id/edit_explanation',verifyToken,authorize(['teacher']),async (req, res, next) => {
    const { tryout_id, subject_id, question_id } = req.params
    let { correct_answer_index, question_explanation } = req.body

    if (!correct_answer_index) return res.status(400).json({ message: 'correct_answer_index is required.' })

    if (typeof correct_answer_index === "undefined") {
      return res.status(400).json({ message: "Indeks jawaban benar tidak valid." })
    }

    correct_answer_index = parseInt(correct_answer_index, 10)
    if (isNaN(correct_answer_index) || correct_answer_index < 0) {
      return res.status(400).json({ message: "Indeks jawaban benar tidak valid." })
    }

    if (typeof question_explanation === "undefined" || question_explanation.trim() === "") {
      return res.status(400).json({ message: "Pembahasan soal tidak boleh kosong." })
    }

    if (!req.session || !req.session.tempQuestionData) {
      return res.status(400).json({ message: "Data soal sementara tidak ditemukan, mohon mulai dari awal." })
    }

    const tempData = req.session.tempQuestionData

    const finalData = {tryout_id,subject_id,question: tempData.question,question_image: tempData.question_image,score: tempData.score,answer_options: tempData.answer_options,correct_answer_index,question_explanation: question_explanation.trim()}

    try {
      await tryout.updateQuestionWithExplanation(parseInt(question_id, 10), finalData)
      req.session.tempQuestionData = null
      res.status(200).json({ message: "OK" })
    } catch (error) {
      res.status(500).json({ message: error.message })
    }
  }
)

//delete soal by id question
router.delete('/teacher/tryout/:tryout_id/:subject_id/:question_id/delete', verifyToken, authorize(['teacher']), deleteQuestionImage, async (req, res) => {
  try {
    const { question_id, tryout_id, subject_id } = req.params

    await tryout.deleteQuestionById(question_id, tryout_id, subject_id)

    res.status(200).json({ message: 'OK' })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}
)

module.exports = router
