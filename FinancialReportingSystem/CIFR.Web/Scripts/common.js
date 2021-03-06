function getCategoryId() {
    var node = $("#catalogTree").jstree('get_selected');
    return node.attr('rel') !== 'drive' ? node.attr('id').replace('node_', '') : null;
}

var tabEditor = new function () {
    this.tabDom = null;
    this.nodeId = null;
    this.typeId = null;
    this.newTypeId = null;
    this.title = '';
    this.isNew = false;
    this.currentTabIndex = 0;

    this.options = {};

    this.init = function (tabElementId, options) {
        var emptyFn = function () { };
        var defaultOptions = { onRemove: emptyFn, onCreate: emptyFn, onUpdate: emptyFn, onReset: emptyFn };
        this.options = $.extend({}, defaultOptions, options);

        var self = this;
        self.tabDom = $(tabElementId).tabs();
        self.tabDom.bind('tabsselect', function (r, ui) {
            self.currentTabIndex = ui.index;
        });
        $('#create_type_with').delegate('li>a', 'click', function () {
            self.newTypeId = $(this).data('id');
            self.isNew = true;
            self._onCreate(self.newTypeId);
            $('#node_type').text($(this).text());
        });
        $('#form-save').click(function () {
            self._onSave();
            return false;
        });
        $('#form-remove').click(function () {
            self._onRemove();
            return false;
        });
        $('#form-reset').click(function () {
            self._onReset();
            return false;
        });
    };

    this.showEdit = function (isHome) {
        this.isNew = false;
        $('#current_category_id').val(this.nodeId);
        if (isHome) {
            this.tabDom.tabs('disable', 0);
            var oldIndex = this.currentTabIndex;
            this.tabDom.tabs('select', 1);
            this.currentTabIndex = oldIndex;
            this.tabDom.tabs('url', 1, '/entityconfig/?typeid=1');
            this.tabDom.tabs('load', 1);
            //$('#form-remove').attr('disabled', true);
        }
        else {
            this.tabDom.tabs('enable', 0);
            this.tabDom.tabs('enable', 1);
            this.tabDom.tabs('select', this.currentTabIndex);
            this.tabDom.tabs('url', 1, '/entityconfig/?typeid=' + this.typeId + '&enid=' + this.nodeId);
            this.tabDom.tabs('load', 1);
            $('input[name=name]').val(this.title);
        }
    };

    this._onRemove = function () {
        var currentCategoryId = getCategoryId();
        if (currentCategoryId) {
            if (confirm('Are you sure remove the node \'' + this.title + '\'?') === false) return;
            this.options.onRemove(currentCategoryId);
            $("#catalogTree").jstree('delete_node', null);
        }
    };

    this._onCreate = function (typeId) {
        $('#tabs-config').html('');
        this.tabDom.tabs('disable', 1);
        this.tabDom.tabs('enable', 0);
        this.tabDom.tabs('select', 0);
        $('#content').addClass('be-status-create');
        $('#type_id').val(typeId);
        $('input[name=name]').val('').focus();
    };

    this._onReset = function () {
        this.options.onReset();
    };

    this._onSave = function () {
        if (this.isNew) {
            var nodeTitle = $('input[name=name]').val();
            var typeId = $('#type_id').val();

            if ($.trim(nodeTitle) === '') return false;

            this.options.onCreate(typeId, nodeTitle);
        }
        else {
            if (this.typeId !== 'drive') {
                var nodeTitle = $('input[name=name]').val();
                if ($.trim(nodeTitle) === '') return false;
                $("#catalogTree").jstree('rename_node', null, nodeTitle);

                var categoryId = $('#current_category_id').val();
                this.options.onUpdate(categoryId, nodeTitle);
            }
            $('#data-form').submit();
        }
    };
};

$(function () {
    var cateTree = $("#catalogTree");

    tabEditor.init('#tabs', {
        onRemove: function (id) {
            $.post(
                "/hoteltree/",
                {
                    "operation": "remove_node",
                    "id": id
                }
            );
        },
        onCreate: function (typeId, title) {
            cateTree.jstree("create", null, 'last', {
                attr: { rel: typeId },
                data: title
            }, null, true);
        },
        onUpdate: function (nodeId, title) {
            $.post(
                "/hoteltree/",
                {
                    "operation": "rename_node",
                    "id": nodeId,
                    "title": title
                },
                function (r) {
                    if (r.status) {

                    }
                }
            );
        },
        onReset: function () {
            cateTree.jstree('refresh');
        }
    });
    $('#catalogTree').bind('selected', function (e, id, typeId, text) {
        tabEditor.nodeId = id;
        tabEditor.title = text;
        tabEditor.typeId = typeId;
        var node = $("#catalogTree").jstree('get_selected');
        var isHome = node.attr('rel') === 'drive';

        yii.resetStatus();

        tabEditor.showEdit(isHome);
        if (!isHome) {
            $('#create_type_with>li>a').each(function () {
                var id = $(this).data('id');
                if (parseInt(typeId) == parseInt(id)) {
                    $('#node_type').text($(this).text());
                }
            });
            $('#is_default').val('0');
        }
        else {
            $('#is_default').val('1');
            $('#node_type').text('Home');
        }
    });

    $('#tabs-config').delegate('.use_default_checkbox', 'change', function () {
        var the = $(this),
            targetInput = $(the.attr('rel'));

        if (the.attr('checked')) {
            targetInput.attr('disabled', true);
        }
        else {
            targetInput.attr('disabled', false).focus();
        }
    });

    $('#data-form').ajaxForm(function () {
        yii.showMessage('success', 'The node has been saved.');
    });

    //$('.nav-custom').superfish({
    //    hoverClass: 'sfHover',
    //    pathClass: 'overideThisToUse',
    //    delay: 0,
    //    animation: { opacity: 'show' },
    //    speed: 'normal',
    //    autoArrows: false,
    //    dropShadows: false,
    //    disableHI: false, /* set to true to disable hoverIntent detection */
    //    onInit: function () { },
    //    onBeforeShow: function () { },
    //    onShow: function () { },
    //    onHide: function () { }
    //});

    //$('.nav-custom').css('display', 'block');

    route = getURLVar();
    if (!route) {
        $('#menu_dashboard').addClass('selected');
    } else {
        if (route == 'srbac') route = 'system';
        $('#' + route).addClass('selected');
    }

    var ajaxbg = $("#background,#progressBar");
    ajaxbg.hide();
    $(document).ajaxStart(function () {
        ajaxbg.show();
    }).ajaxStop(function () {
        setTimeout(function () {
            ajaxbg.hide();
        }, 300);
    });

    var __controller = 'hotelconfiguration';
    $('.nav-custom > li.selected').removeClass('selected');
    $('.nav-custom > li.cm-' + __controller).addClass('selected');
    pageSrv.init();
});

function getURLVar() {
    var urlHalves = String(document.location).toLowerCase().split('.php/');
    var urlVarValue = '';

    if (urlHalves[1]) {
        var urlVars = urlHalves[1].split('/');
        urlVarValue = urlVars[0];
    }

    return urlVarValue;
}

function showDownloadFileExcel(fname, fsize, furl) {
    $("#downloadfileexcel").find(".modal-body").html(" <p class='download_excel'>" + fname + "<span class='file_size'>[Size:" + fsize + "]</span><span class='file_size'> <a target='_blank' href='" + furl + "' class='download'>下载</a></span></p> ");
    $("#downloadfileexcel").modal({
        keyboard: false,
        backdrop: "static"
    });
}