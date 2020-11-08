'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class TimelineGroup extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }
  };
  TimelineGroup.init({
    timeline_id: DataTypes.INTEGER,
    user_id: DataTypes.INTEGER,
    group_id: DataTypes.INTEGER,
    group_name: DataTypes.STRING
  }, {
    sequelize,
    modelName: 'TimelineGroup',
  });
  TimelineGroup.associate = function (models) {
    TimelineGroup.hasOne(models.Group_map, {
      sourceKey: 'group_id',
      foreignKey: 'group_id'
    });
    TimelineGroup.hasOne(models.Timeline, {
      sourceKey: 'timeline_id',
      foreignKey: 'id'
    });
  };
  return TimelineGroup;
};
