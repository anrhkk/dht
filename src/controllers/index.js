'use strict';
import moment from 'moment';

export default async(ctx, next) => {
  let page = this.get("page") || 1;
  let keyword = this.get("keyword");
  let sortBy = this.get("sortBy") || "created_at";
  let sortType = this.get("sortType") || "DESC";
  let model = this.model("torrents");
  let list = yield model.where({name: new RegExp(keyword, 'i')}).order(sortBy + ' ' + sortType).page(page, 20).countSelect(true);
  list.data.forEach(function (item, i) {
    list.data[i].created_at = moment(item.created_at).format("YYYY-MM-DD HH:mm:ss");
    list.data[i].size = formatFileSize(item.size);
    list.data[i].name = item.name.replace(new RegExp(keyword, 'i'), '<b class="text-primary">' + keyword + '</b>');
  });
  
  await ctx.render('index', {page: page, sortBy: sortBy, sortType: sortType, list: list});
}
