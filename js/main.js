var sd;
$(document).ready(function() {
    $.tf = function($el) {
        this.$el                        = $el;
        this.turn                       = 'p1';
        this.currentPlayer              = {};
        this.playerList                 = [];
        this.accessorPattern            = /R([0-9])C([0-9])/;
        this.numRows                    = 5;
        this.lastTileClicked            = {};
        this.lastTilePreviewed          = {};
        this.model                      = {
            'current'                       : {},
            'preview'                       : {}
        };
        this.view                       = {};
        this.numCols                    = 5;
        this.Templates                  = {};
        this.Templates.Board            = Handlebars.compile($("#board-template").html());
        this.Templates.Head             = Handlebars.compile($("#header-template").html());
        this.Models                     = {};
        this.Models.Board               = function() {
            this.rows                       = [];
        };

        this.Models.Owner                   = function() {
            this.name           = null,
            this.num            = 0,
            this.class          = 0
        };

        this.Models.Tile                = function() {
            this.row                        = null;
            this.col                        = null;
            this.status                     = 'neutral';
            this.accessor                   = null;
            this.owner                      = null;
        }

        this.Models.Row                 = function() {
        };

        this.init                       = function() {
            var p1 = new this.Models.Owner;
            p1.name         = 'B-dizzle';
            p1.num          = 1;
            p1.class        = 'p1';
            p1.isCurrent    = true;

            var p2 = new this.Models.Owner;
            p2.name         = 'C-tizzle';
            p2.num          = 2;
            p2.class        = 'p2';
            p2.isCurrent    = false;

            this.playerList[0] = p1;
            this.playerList[1] = p2;
            this.currentPlayer = 0;

            var modelToSave = new this.Models.Board;
            for(row=0;row<this.numRows;row++) {//                       create rows
                modelToSave.rows[row] = new this.Models.Row;
                for(col=0;col<this.numCols;col++) {//                   create cols inside rows
                    var newTile = new this.Models.Tile();
                    newTile.row=row;
                    newTile.col=col;
                    newTile.accessor='R'+row+'C'+col;
                    console.log(newTile);
                    modelToSave.rows[row][col] = newTile;
                }
            }

            this.model.current = modelToSave;//                                 save to model
            this.model.preview = new this.Models.Board;//                                 save to model

            this.declareHelpers();
            this.render();//                                       fire renderBoard
        };

        this.render                     = function(preview) {
            //make sure the game hasn't ended (all tiles taken)
            if(this.$el.find('.col.p1,.col.p2').length < (this.numRows * this.numCols)) {
                var modelToUse;

                if(typeof preview === 'undefined') preview = false;
                preview ? modelToUse = this.model.preview : modelToUse = this.model.current;
                this.view.board = this.$el.find('.bd').html(this.Templates.Board(modelToUse));
                this.view.header = this.$el.find('header').html(this.Templates.Head(modelToUse));
                this.bind();
            }
            else this.endGame();
        };

        this.generateAccessor           = function(row,col) {
            return 'R' + row + 'C' + col;
        };

        this.parseAccessor              = function(accessor) {

            var result = this.accessorPattern.exec(accessor);

            var returnData =  {
                row: result[1],
                col: result[2]
            };
            return returnData;
        };

        this.parseAccessorFromRawClass  = function(rawClass) {
            var result = this.accessorPattern.exec(rawClass);
            return result[0];
        }

        this.getByAccessor              = function(accessor,preview) {
            if(typeof preview === 'undefined') preview = false;
            preview ? modelToUse = this.model.preview : modelToUse = this.model.current;
            var loc = this.parseAccessor(accessor);

            return modelToUse['rows'][loc.row][loc.col];
        }
        this.getByRC                    = function(row,col,Tile,preview) {
            if(typeof Tile.accessor !== 'undefined') {
                var modelToUse;
                if(typeof preview === 'undefined') preview = false;
                preview ? modelToUse = this.model.preview : modelToUse = this.model.current;
                modelToUse['rows'][row + 1][col +1 ] = Tile;
            }
        }
        this.setByRC                    = function(row,col,Tile,preview) {
            var modelToUse;
            if(typeof preview === 'undefined') preview = false;

            modelToUse = this.model.current['rows'][Tile.row][Tile.col];
            preview ? this.model.preview =  modelToUse : this.model.current = modelToUse;
        }
        this.setByAccessor              = function(accessor,Tile,preview) {
            if(typeof Tile.accessor !== 'undefined') {
                var modelToUse;
                if(typeof preview === 'undefined') preview = false;
                var loc = this.parseAccessor(Tile.accessor);

                modelToUse = this.model.current['rows'][Tile.row][Tile.col];
                preview ? this.model.preview =  modelToUse : this.model.current = modelToUse;
            }
        }

        this.bind                       = function() {
            var that = this;
            $('.row .col',$el).mousedown(function(e) {       that.previewMove(e);});
            $('.row .col',$el).mouseup(function(e) {         that.makeMove(e);});
        }
        this.getScoreForPlayer          = function(playerNum) {
            return this.$el.find('.col.p' + playerNum).length;
        }
        this.declareHelpers             = function() {
            var that = this;
            Handlebars.registerHelper('playerScore', function(playerNum) {
                return that.getScoreForPlayer(playerNum);
            });
            Handlebars.registerHelper('activePlayerClass', function(playerNum) {
                return 'p'+(that.currentPlayer+1)+'Active';
            });
        }

        this.previewMove                = function(e) {
            if($(e.target).hasClass('col')) {
                var accessor = this.parseAccessorFromRawClass(e.target.className);
                var Tiles = this.determineAffectedSquares(this.getByAccessor(accessor));
                this.claimSquares(Tiles);
                this.render();
            }
        };

        this.makeMove                   = function(e){
            if($(e.target).hasClass('col')) {
                var accessor = this.parseAccessorFromRawClass(e.target.className);
                var Tiles = this.determineAffectedSquares(this.getByAccessor(accessor));
                this.claimSquares(Tiles,true);
                this.endTurn();
                this.render();
            }
        };

        this.determineAffectedSquares   = function(Tile) {
            if(Tile.status != 'locked')
            {
                var as= [];//                   affected squares

                if(Tile.row != 0) {//            if not in top row get col num above
                    as.push(this.model.current.rows[Tile.row-1][Tile.col]);
                }
                if(Tile.col != 0) {//            if not in top row get col num to left
                    as.push(this.model.current.rows[Tile.row][Tile.col-1]);
                }
                if(Tile.row < this.numRows - 1) {//            if not on right col get col to right
                    as.push(this.model.current.rows[Tile.row+1][Tile.col]);
                }
                if(Tile.col < this.numCols - 1) {//            if not on bottom row get bottom col
                    as.push(this.model.current.rows[Tile.row][Tile.col+1]);
                }

                //make sure none of the squares are locked
                for(i=0;i<as.length;i++) {
                    console.log(as[i]);
                    if(as[i].status == 'locked') as.splice(i,1);
                }

                Tile.status = 'locked';
                as.push(Tile);

                return as;
            }
            else return [];
        }

        this.claimSquares              = function(Tiles,preview) {
            var modelToUse;
            if(typeof preview === 'undefined') preview = false;
            preview ? modelToUse = this.model.preview : modelToUse = this.model.current;

            for(i=0;i<Tiles.length;i++) {

                if(typeof Tiles[i] !== 'undefined' && typeof Tiles[i].accessor !== 'undefined') {
                    Tiles[i].owner = this.playerList[this.currentPlayer];
                    this.setByRC(Tiles[i].row,Tiles[i].col, Tiles[i], true);
                }
            }
        }
        this.endTurn                    = function() {
            if(this.currentPlayer < (this.playerList.length - 1)) this.currentPlayer++;
            else this.currentPlayer = 0;
        }
        this.endGame                    = function() {
            if(this.getScoreForPlayer(0) < this.getScoreForPlayer(1)) {
                alert('Player 1 (red) wins!')
            }
            else {
                alert('Player 2 (blue) wins!')
            }
            window.location.reload();
        }
        this.init();
    }
    tf = new $.tf($('#main_contain'));
});
