'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class TimelineFollow extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }
  };
  TimelineFollow.init({
    timeline_id: DataTypes.INTEGER,
    user_id: DataTypes.INTEGER,
    followedUser_id: DataTypes.INTEGER,
    followedUser_name: DataTypes.STRING
  }, {
    sequelize,
    modelName: 'TimelineFollow',
  });
  TimelineFollow.associate = function (models) {
    TimelineFollow.hasOne(models.Timeline, {
      sourceKey: 'timeline_id',
      foreignKey: 'id'
    });
  };
  return TimelineFollow;
};
