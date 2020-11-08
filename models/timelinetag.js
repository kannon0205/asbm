'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class TimelineTag extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }
  };
  TimelineTag.init({
    timeline_id: DataTypes.INTEGER,
    user_id: DataTypes.INTEGER,
    tag_id: DataTypes.INTEGER,
    tag_name: DataTypes.STRING
  }, {
    sequelize,
    modelName: 'TimelineTag',
  });
  TimelineTag.associate = function (models) {
    TimelineTag.hasOne(models.Tag_map, {
      sourceKey: 'tag_id',
      foreignKey: 'tag_id'
    });
    TimelineTag.hasOne(models.Timeline, {
      sourceKey: 'timeline_id',
      foreignKey: 'id'
    });
  };
  return TimelineTag;
};
