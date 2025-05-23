const {DataTypes} = require(`sequelize`)
const {db} = require(`../connection`)

const studentsAnswerTable = db.define(`students_answer`,{
    student_answer_id:{
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    id_student: DataTypes.INTEGER,
    answer_options_id: DataTypes.INTEGER,
    id_answer_option: DataTypes.INTEGER
}, {
    timestamps: false
})

module.exports = studentsAnswerTable