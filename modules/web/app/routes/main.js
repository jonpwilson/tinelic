define(["tinybone/backadapter", "safe","lodash"], function (api,safe,_) {
	return {
		index:function (req, res, cb) {
			safe.parallel({
				view:function (cb) {
					requirejs(["views/index_view"], function (view) {
						safe.back(cb, null, view)
					},cb)
				},
				data: function (cb) {
					api("assets.getProjects","public", {_t_age:"30d"}, safe.sure(cb, function (project) {
						var quant = 1; var period = 15;
						var dtend = new Date();
						var dtstart = new Date(dtend.valueOf() - period * 60 * 1000);
						safe.forEach(project, function (n, cb) {
							api("collect.getPageViews", "public", {
								_t_age: quant + "m", quant: quant, filter: {
									_idp: n._id,
									_dtstart: dtstart,
									_dtend: dtend
								}
							}, safe.sure(cb, function (v) {
								var vall = null; var vale = null; var valr = null;
								if (v.length) {
									vall = vale = valr = 0;
									_.each(v, function (v) {
										valr+=v.value?v.value.r:0;
										vall+=v.value?(v.value.tt/1000):0;
										vale+=100*(v.value?(1.0*v.value.e/v.value.r):0);
									})

									vall=(vall/period).toFixed(2);
									vale=(vale/period).toFixed(2);
									valr=(valr/period).toFixed(2);
								}

								cb(null,_.extend(n, {views: valr, errors: vale, etu: vall}))
							}))
						}, safe.sure(cb, function() {
							cb(null, project)
						}))
					}))
				}
			}, safe.sure(cb, function (r) {
				res.render({
					view:r.view,
					data:{
						projects:r.data,
						title:"Tinelic - Home"
					}})
			}))
		},
		event:function (req, res, next) {
			safe.parallel({
				view:function (cb) {
					requirejs(["views/event_view"], function (view) {
						safe.back(cb, null, view)
					},cb)
				},
				event:function (cb) {
					api("collect.getEvent","public", {_t_age:"30d",_id:req.params.id}, cb)
				},
				info:function (cb) {
					api("collect.getEventInfo","public", {_t_age:"10m",filter:{_id:req.params.id}}, cb)
				}
			}, safe.sure( next, function (r) {
				res.render({view:r.view,data:{event:r.event,info:r.info,title:"Event "+r.event.message}})
			}))
		},
		page:function (req, res, cb) {
			requirejs(["views/page_view"], function (view) {
				res.render({view:view,data:{title:"Page Page"}})
			}, cb);
		},
		users:function (req, res, cb) {
			safe.parallel({
				view: function (cb) {
					requirejs(["views/users_view"], function (view) {
						safe.back(cb, null, view)
					}, cb)
				},
				users: function (cb) {
					api("users.getUsers", "public", {}, cb)
				}
			},safe.sure(cb, function(r) {
				res.render({view: r.view, data: {title: "Manage users", users: r.users}})

			}))
		},
		project:function (req, res, cb) {
			var str = req.query._str || req.cookies.str || '1d';
			var quant = 10;
			var range = 60 * 60 * 1000;

			// transcode range paramater into seconds
			var match = str.match(/(\d+)(.)/);
			var units = {
				h:60 * 60 * 1000,
				d:24 * 60 * 60 * 1000,
				w:7 * 24 * 60 * 60 * 1000
			}
			if (match.length==3 && units[match[2]])
				range = match[1]*units[match[2]];

			var dtstart = new Date(Date.parse(Date()) - range);
			var dtend = Date();

			safe.parallel({
				view:function (cb) {
					requirejs(["views/project/project_view"], function (view) {
						safe.back(cb, null, view)
					},cb)
				},
				data:function (cb) {
					api("assets.getProject","public", {_t_age:"30d",filter:{slug:req.params.slug}}, safe.sure( cb, function (project) {
						safe.parallel({
							views: function (cb) {
								api("collect.getPageViews","public",{_t_age:quant+"m",quant:quant,filter:{
									_idp:project._id,
									_dtstart: dtstart,
									_dtend: dtend
								}}, cb);
							},
							errors: function (cb) {
								api("collect.getErrorStats","public",{_t_age:quant+"m",filter:{
									_idp:project._id,
									_dtstart: dtstart,
									_dtend: dtend
								}}, cb);
							},
							ajax: function (cb) {
								api("collect.getAjaxStats","public",{_t_age:quant+"m",quant:quant,filter:{
									_idp:project._id,
									_dtstart: dtstart,
									_dtend: dtend
								}}, cb);
							}
						}, safe.sure(cb, function (r) {
							 cb(null,_.extend(r, {project:project, filter: str}))
						}))
					}))
				}
			}, safe.sure(cb, function (r) {
				res.render({view:r.view,data:_.extend(r.data,{quant:quant,title:"Project "+r.data.project.name})})
			}))
		}
	}
})
