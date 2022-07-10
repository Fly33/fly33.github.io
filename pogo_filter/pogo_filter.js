function map(fn) {
    return function*(it) {
        for (let item of it)
            yield fn(item);
    };
}

function integrate() {
    return function*(it) {
        for (let item of it)
            yield* item;
    };
}

function filter(fn) {
    return function*(it) {
        for (let item of it)
            if (fn(item))
                yield item;
    };
}

function reduce(fn) {
    return function(it) {
        var result
        let first = true;
        for (let item of it) {
            if (first) {
                result = item;
                first = false;
                continue;
            }
            result = fn(result, item);
        }
        return result;
    }
}

function join(s) {
    return function(it) {
        var result = ''
        let first = true;
        for (let item of it) {
            if (first)
                first = false;
            else
                result += s;
            result += item;
        }
        return result;
    };
}

function chain(it, fn, ...jobs) {
    if (!fn)
        return it;
    return chain(fn(it), ...jobs);
}

function* object_keys(obj) {
    for (key in obj)
        yield key;
}

function* object_entries(obj) {
    for (key in obj)
        yield [key, obj[key]];
}

function lower_bound(arr, v) {
    let i = -1, j = arr.length;
    while(j - i > 1) {
        let k = (i + j) >> 1;
        if (v <= arr[k])
            j = k;
        else
            i = k;
    }
    return j;
}

// Set.prototype.toString = function () {
    // var result = '{'
    // for (let [key, value] of this) {
        // result += key + ',';
    // }
    // result += '}'
    // return result;
// }

// Map.prototype.toString = function () {
    // var result = '{'
    // for (let [key, value] of this) {
        // result += key + '=>' + value + ',';
    // }
    // result += '}'
    // return result;
// }

var data;
var pokemon;
var l10n, l10n_by_id;
var storage, list, species;
var tags;
var groups, filters, selected, sections;
var shiny = 0, costume = 0;

function prepare_structures() {
    groups = {};
    function add_item(grp, key, ...args) {
        if (!grp[key])
            grp[key] = {value: 0};
        if (args.length === 0)
            return;
        if (!grp[key].sub)
            grp[key].sub = {};
        add_item(grp[key].sub, ...args);
    }
    for (let i = 0; i < data.length; ++i) {
        // Имя пока, фильтр 1, фильтр 2, шайни, костюмы, пол
        for (let j = 0; j < data[i].genus.length; ++j) {
            add_item(groups, data[i].name, data[i].filter1, data[i].filter2, data[i].genus[j].kind.shiny ? "shiny" : "", data[i].genus[j].kind.costume ? "costume" : "", data[i].genus[j].gender);
        }
    }
    sections = new Map();
    filters = {};
    for (let key in groups) {
        filters[key] = generate_filter(key);
    }
    selected = {};
}

function zero_groups(grp) {
    for (let key in grp) {
        let value = grp[key];
        if (value.value && value.sub)
            zero_groups(value.sub);
        value.value = 0;
    }
}

function update_node(node, value, ...args) {
    if (args.length === 0) {
        node.value += value;
        return;
    }
    update_node(node.sub[value], ...args);
    node.value = false;
    for (let key in node.sub) {
        if (!node.sub[key].value)
            continue;
        node.value = true;
        break;
    }
}

function bulbapedia_image(bulbapedia_id, size) {
    //return `https://archives.bulbagarden.net/media/upload/thumb/${bulbapedia_id[0]}/${bulbapedia_id}.png/${size}px-${bulbapedia_id.slice(3)}.png`;
    return `https://archives.bulbagarden.net/media/upload/${bulbapedia_id[0]}/${bulbapedia_id}.png`;
}

function fandom_image(fandom_id, size) {
    return `https://static.wikia.nocookie.net/pokemongo/images/${fandom_id[0]}/${fandom_id}.png/revision/latest/smart/width/${size}/height/${size}`;
}

function image(i) {
    return `https://www.serebii.net/pokemongo/pokemon/${data[i].serebii_id}.png`;
    //return `https://archives.bulbagarden.net/media/upload/${data[i].bulbapedia_id}.png`;
    //return `https://github.com/ZeChrales/PogoAssets/blob/master/pokemon_icons/pokemon_icon_${data[i].pogoassets_id}.png?raw=true`;
}

function default_specy() {
    return {checked: 0, tags: []};
}

function save_all() {
    localStorage.setItem(location.pathname, JSON.stringify(storage));
}

function load_list() {
    console.log(`loading ${$('#list select').val()}`);
    list = storage.lists[$('#list select').val()];
    if (!list._version_) { // conversion
        list = {
            species: list,
            _version_: 1,
            compact: !!list['_compact_'],
        }
        delete list.species['_compact_'];
        storage.lists[$('#list select').val()] = list;
    }
    species = list.species;

    //console.log(species);

    sections.clear();
    zero_groups(groups);
    selected = {};
    tags = {};

    shiny = 0;
    costume = 0;

//    let l10n = l10n_by_id[storage.language].data;

    $('#compact').prop('checked', list.compact);
    for (let i = 0; i < data.length; ++i) {
        data[i].checked = 0;
        data[i].tags = {}
        for (let j = 0; j < data[i].genus.length; ++j) {
            let id = data[i].genus[j].id;
            $(`#${id}`).removeClass('checked');
            let pvpoke_id = data[i].pvpoke_id + (data[i].genus[j].kind.shiny ? '_shiny' : '');
            if (!species[id] && species[pvpoke_id] && (species[pvpoke_id].gender & (data[i].genus[j].male * 2 + data[i].genus[j].female || 3)) && !data[i].genus[j].kind.costume) {
                //console.log(species[pvpoke_id]);
                species[id] = {checked: 1, tags: []};
                if (species[pvpoke_id].section) {
                    species[id].tags.push(species[pvpoke_id].section);
                }
            }
            if (!species[id] || !species[id].checked)
                continue;
            for (let tag_name of species[id].tags) {
                if (!(tag_name in tags))
                    tags[tag_name] = 0;
                ++tags[tag_name];
                if (!(tag_name in data[i].tags))
                    data[i].tags[tag_name] = 0;
                ++data[i].tags[tag_name];
            }
            species[id].checked = false;
            check_pokemon(pokemon[id]);
            //console.log(pokemon[id]);
        }
        update(data[i]);
        delete species[data[i].pvpoke_id];
        delete species[data[i].pvpoke_id + '_shiny'];
    }

    generate();
    onfilter();
}

function generate_filter(pokemon_name) {
    function gen_term(key, keys) {
        if (key !== "")
            return l10n => ',!' + l10n.filters[key];
        keys = Array.from(chain(keys, filter(x => x), map(x => x.toLowerCase())));
        return l10n => chain(keys, map(key => ',' + l10n.filters[key]), join(''));
    }
    
    function gen(node) {
        if (!node.sub)
            return function*(_l10n) {
                if (!node.value)
                    yield "";
            };
        let items = Array.from(chain(object_keys(node.sub), map(key => [key.toLowerCase(), node.sub[key]]), map(([key, value]) => ({key: key, term_gen: gen_term(key, object_keys(node.sub)), sub_gen: gen(value)}))));
        if (items.length === 1)
            return items[0].sub_gen;
        let is_shiny = !!node.sub["shiny"];
        let is_costume = !!node.sub["costume"];
        let index = items[0].key === "" ? 0 : 1;
        return function*(l10n) {
            if (!node.value)
                yield "";
            else if (!shiny && is_shiny)
                yield* items[index].sub_gen(l10n);
            else if (!costume && is_costume)
                yield* items[index].sub_gen(l10n);
            else {
                for (let {_key, term_gen, sub_gen} of items) {
                    let term = term_gen(l10n);
                    for (let tail of sub_gen(l10n)) {
                        yield term + tail;
                    }
                }
            }
        };
    }
    
    let node = groups[pokemon_name];
    let filter_gen = gen(node);
    return (l10n) => chain(filter_gen(l10n), filter(x => x), map(filter => '&!' + l10n.names[pokemon_name.toLowerCase()] + filter));
}

function add_to_section(poke, section) {
    if (!sections.has(section))
        sections.set(section, new Set());
    sections.get(section).add(poke.id);
}

function remove_from_section(poke, section) {
    if (!sections.has(section))
        return;
    sections.get(section).delete(poke.id);
    if (sections.get(section).size === 0)
        sections.delete(section);
} 

function check_pokemon(poke) {
    if (!species[poke.id])
        species[poke.id] = default_specy();
    if (species[poke.id].checked)
        return;
    ++poke.data.checked;
    if (poke.kind.shiny)
        ++shiny;
    if (poke.kind.costume)
        ++costume;
    species[poke.id].checked = true;
    $(`#${poke.id}`).addClass('checked');
    update_node(groups[poke.data.name], poke.data.filter1, poke.data.filter2, poke.kind.shiny ? "shiny" : "", poke.kind.costume ? "costume" : "", poke.gender, 1);
    if (species[poke.id].tags.length) {
        for (let tag of species[poke.id].tags) {
            add_to_section(poke, tag);
        }
    } else {
        add_to_section(poke, "");
    }
    update(poke.data);
}

function uncheck_pokemon(poke) {
    if (!species[poke.id])
        return;
    if (!species[poke.id].checked)
        return;
    --poke.data.checked;
    if (poke.kind.shiny)
        --shiny;
    if (poke.kind.costume)
        --costume;
    species[poke.id].checked = false;
    $(`#${poke.id}`).removeClass('checked');
    update_node(groups[poke.data.name], poke.data.filter1, poke.data.filter2, poke.kind.shiny ? "shiny" : "", poke.kind.costume ? "costume" : "", poke.gender, -1);
    if (species[poke.id].tags.length) {
        for (let tag of species[poke.id].tags) {
            remove_from_section(poke, tag);
        }
    } else {
        remove_from_section(poke, "");
    }
    update(poke.data);
}

function toggle_pokemon(poke) {
    let {checked} = species[poke.id] || default_specy();
    if (checked)
        uncheck_pokemon(poke);
    else
        check_pokemon(poke);
}

function update(data) {
    let container = $(`#${data.pvpoke_id}`); 
    if (data.checked)
        container.addClass('checked');
    else
        container.removeClass('checked');
    if (selected[data.pvpoke_id])
        container.addClass('selected');
    else
        container.removeClass('selected');
    let tag_keys = Object.keys(data.tags);
    if (tag_keys.length === 0)
        container.find('> u').text("");
    else if (tag_keys.length === 1)
        container.find('> u').text(tag_keys[0]);
    else
        container.find('> u').text(`§*${tag_keys.length}`);
}

function generate() {
    let l10n = l10n_by_id[storage.language].data;
    let result;
    if (list.compact)
        result = generate_compact(l10n);
    else
        result = generate_full(l10n);
    $('textarea').val(result);
}

function binary_search(arr, v) {
    if (arr.length === 0)
        return false;
    let i = 0, j = arr.length;
    while(j - i > 1) {
        let k = (i + j) >> 1;
        if (v < arr[k])
            j = k;
        else
            i = k;
    }
    return arr[i] === v;
}

function generate_full(l10n) {
    let result = chain([...sections.keys()].sort(), map(key => [key, sections.get(key)]), map(function ([key, value]) {
        return [key, chain([...value.values()].sort((id1, id2) => pokemon[id1].data.dex - pokemon[id2].data.dex), map(function(id) {
            let poke = pokemon[id];
            let data = poke.data;
            var pokemon_name = l10n.names[data.name.toLowerCase()];
            if (data.origin) 
                pokemon_name += ':(' + l10n.forms[data.origin.toLowerCase()] + ')';
            if (data.form)
                pokemon_name += ':(' + l10n.forms[data.form.toLowerCase()] + ')';
            if (poke.kind.title)
                pokemon_name += ':(' + l10n.forms[poke.kind.title.toLowerCase()] + ')';
            if (poke.kind.shiny)
                pokemon_name += ':(' + l10n.forms['shiny'] + ')';
            if (poke.pair) {
                let {checked: pair_checked} = species[poke.pair.id] || default_specy();
                if (poke.female && pair_checked && value.has(poke.pair.id))
                    return "";
                if (poke.male && !(pair_checked && value.has(poke.pair.id)) || poke.female)
                    pokemon_name += ':(' + l10n.forms[poke.gender] + ')';
            }
            return pokemon_name;
        }), filter(name => name), join(', '))]
    }), filter(([_key, value]) => value), 
    map(([key, value]) => '§' + key + ': ' + value + ';\n'),
    join(''));
    if (!result)
        return '';
    result = l10n.phrases.caption + '\n\n' + result;
    result += '\n' + l10n.phrases.caption2 + '\n';
    result += chain(object_keys(filters), filter(key => groups[key].value), map(key => filters[key](l10n)), integrate(), join(''));
    if (!shiny)
        result += '&!' + l10n.filters['shiny'];
    if (!shiny) // && !legendary
        result += '&!' + l10n.filters['purified'];
    if (!costume)
        result += '&!' + l10n.filters['costume'];
    result += '&!' + l10n.filters['shadow'] + '&!' + l10n.filters['traded'] + '&!4*;\n\n' + l10n.phrases.postscript;
    return result;
}

function generate_compact(l10n) {
    let result = '';
    let first, last;
    for (let i = 0; i < data.length; ++i) {
        for (let j = 0; j < data[i].genus.length; ++j) {
            let {checked} = species[data[i].genus[j].id] || default_specy();
            if (!checked)
                continue;
            if (last && last+1 >= data[i].dex)
                last = +data[i].dex;
            else {
                if (first) {
                    if (first < last)
                        result += `${first}-${last},`;
                    else
                        result += `${first},`;
                }
                first = last = +data[i].dex;
            }
            break;
        }
    }
    if (!first)
        return '';
    if (first < last)
        result += `${first}-${last}`;
    else
        result += `${first}`;

    function footer(l10n) {
        let result = chain(object_keys(filters), filter(key => groups[key].value), map(key => filters[key](l10n)), integrate(), join(''));
        if (!shiny)
            result += '&!' + l10n.filters['shiny'];
        if (!shiny) // && !legendary
            result += '&!' + l10n.filters['purified'];
        if (!costume)
            result += '&!' + l10n.filters['costume'];
        result += '&!' + l10n.filters['shadow'] + '&!' + l10n.filters['traded'];
        return result;
    }
    result += footer(l10n);
    let l10n_en = l10n_by_id['en'].data;
    if (l10n !== l10n_en)
        result += footer(l10n_en);
    result += '&!4*;' + l10n.phrases.postscript;
    return result;
}

var selection_mode = false;
var selection_size = 0;

let last_click_time, last_click_index;

function on_pokemon_click(i) {
    if (selection_mode) {
//        if (last_click_index === i && last_click_time + 300 >= Date.now())
//            new_gender = old_gender - 1;
//        last_click_index = i;
//        last_click_time = Date.now();

        if (selected[data[i].pvpoke_id]) {
            selected[data[i].pvpoke_id] = false;
        } else
            selected[data[i].pvpoke_id] = true;
        update(data[i]);
    } else {
        if (data[i].checked > 0) {
            for (let j = 0; j < data[i].genus.length; ++j) {
                uncheck_pokemon(data[i].genus[j]);
            }
        } else {
            for (let j = 0; j < data[i].genus.length; ++j) {
                if (!shiny && data[i].genus[j].kind.shiny || !costume && data[i].genus[j].kind.costume)
                    continue;
                check_pokemon(data[i].genus[j]);
            }
        }
        generate();
        save_all();
    }    
}

function make_id(kind, male, female) {
    let id = kind.bulbapedia_id.replace('/', '_');
    if (male)
        id = 'M' + id;
    else if (female)
        id = 'F' + id;
    else
        id = 'U' + id;
    return $.escapeSelector(id);
}

function on_pokemon_genus_click(id) {
    toggle_pokemon(pokemon[id]);
    generate();
    save_all();
}

function on_selection_mode_change() {
    if (selection_mode) {
        selection_mode = false;
        for (let i = 0; i < data.length; ++i) {
            if (!selected[data[i].pvpoke_id])
                continue;
            selected[data[i].pvpoke_id] = false;
            update(data[i]);
        }
    } else {
        selection_mode = true;
    }
}

function on_compact_change() {
    list.compact = $('#compact').prop('checked');
    generate();
    save_all();
}

function parse_filter(s) {
    let i = 0;

    function skip_white() {
        while (i < s.length && ' \r\n\t'.indexOf(s[i]) != -1)
            ++i;
    }

    function parse_and() {
        let result = parse_or();
        skip_white();
        while (i < s.length && s[i] === '&') {
            ++i;
            result = {op: "and", arg: [result, parse_or()]};
        }
        return result;
    }
    
    function parse_or() {
        let result = parse_unary();
        skip_white();
        while (i < s.length && ',;:'.indexOf(s[i]) !== -1) {
            ++i;
            result = {op: "or", arg: [result, parse_unary()]};
        }
        return result;
    }
    
    function parse_unary() {
        skip_white();
        if (i < s.length && s[i] === '!') {
            ++i;
            return {op: "not", arg: parse_unary()};
        } else if (i < s.length && s[i] === '+') {
            ++i;
            return {op: "family", arg: parse_unary()};
        } else if (i < s.length && s[i] === '§') {
            let j = i;
            ++i;
            let res = parse_list();
            if (res)
                return res;
            i = j;
        }
        return parse_simple();
    }

    function parse_simple() {
        skip_white();
        let j = i;
        while (i < s.length && '&,;:'.indexOf(s[i]) === -1) {
            ++i;
        }
        let str = s.substring(j, i).trim().toLowerCase();
        return {op: "keyword", arg: str};
    }
    
    function parse_list() {
        let j = i;
        while (i < s.length && ':'.indexOf(s[i]) === -1) {
            ++i;
        }
        if (i >= s.length)
            return;
        let section = s.substring(j, i).trim();
        ++i; // :
        let result = parse_item();
        if (!result)
            return;
        while(true) {
            skip_white();
            if (i >= s.length)
                return;
            if (s[i] === ';')
                break;
            if (s[i] !== ',')
                return;
            ++i;
            let op2 = parse_item();
            if (!op2)
                return;
            result = {op: "or", arg: [result, op2]};
        }
        return {op: "and", arg: [result, {op: "section", arg: section}]};
    }
    
    function parse_item() {
        skip_white();
        let j = i;
        while (i < s.length && ',;'.indexOf(s[i]) === -1 && (s[i] !== ':' || i+1 >= s.length || s[i+1] !== '(')) {
            ++i;
        }
        if (i >= s.length)
            return;
        let name = s.substring(j, i).trim().toLowerCase();
        let result = {op: "specy", arg: name};
        while (i < s.length && ',;'.indexOf(s[i]) === -1) {
            let f = parse_form();
            if (!f)
                return;
            result = {op: "and", arg: [result, f]};
        }
        return result;
    }
    
    function parse_form() {
        if (s[i] !== ':')
            return;
        ++i; // :
        if (s[i] !== '(')
            return;
        ++i; // (
        let j = i;
        while (i < s.length && s[i] !== ')') {
            ++i;
        }
        if (i >= s.length)
            return;
        let form = s.substring(j, i).trim().toLowerCase();
        ++i; // )
        return {op: "form", arg: form};
    }
    
    let r = parse_and();
    if (i != s.length)
        return;
    return r;
}

function make_checker(tree, l10n) {
    let none = {}
    let unclear = {}

    function declare(x, v) {
        return {valid: x, value: v};
    }

    function evaluate(x) {
        return {valid: x, value: +!!x};
    }

    function union(x, y) {
        if (x.length === 0)
            return y;
        if (y.length === 0)
            return x;
        let i = 0, j = 0;
        let result = [];
        while (i < x.length || j < y.length) {
            if (i < x.length && j < y.length && x[i] === y[j]) {
                result.push(x[i]);
                ++i;
                ++j;
            } else if (i < x.length && (j === y.length || x[i] < y[j])) {
                result.push(x[i]);
                ++i;
            } else if (j < y.length && (i === x.length || x[i] > y[j])) {
                result.push(y[j]);
                ++j;
            } else 
                break;
        }
        return result;
    }

    function intersection(x, y) {
        if (x.length === 0)
            return x;
        if (y.length === 0)
            return y;
        let i = 0, j = 0;
        let result = [];
        while (i < x.length || j < y.length) {
            if (i < x.length && j < y.length && x[i] === y[j]) {
                result.push(x[i]);
                ++i;
                ++j;
            } else if (i < x.length && (j === y.length || x[i] < y[j])) {
                ++i;
            } else if (j < y.length && (i === x.length || x[i] > y[j])) {
                ++j;
            } else 
                break;
        }
        return result;
    }

    function or(op1, op2) {
        return function(record) {
            let x = op1(record);
            if (x.valid === true)
                return x;
            let y = op2(record);
            if (x.valid === none)
                return y;
            if (y.valid === none)
                return x;
            if (y.valid === true)
                return {valid: y.valid, value: x.value + y.value};
            let x_tags = x.valid && x.valid !== unclear;
            let y_tags = y.valid && y.valid !== unclear;
            if (x_tags && y_tags)
                return {valid: union(x.valid, y.valid), value: x.value + y.value};
            if (x_tags)
                return {valid: x.valid, value: x.value + y.value};
            if (y_tags)
                return {valid: y.valid, value: x.value + y.value};
            if (x.valid === unclear || y.valid === unclear)
                return {valid: unclear, value: x.value + y.value};
            return {valid: y.valid, value: x.value + y.value};
        }; 
    }

    function and(op1, op2) {
        return function(record) { 
            let x = op1(record);
            if (x.valid === false)
                return x;
            let y = op2(record);
            if (x.valid === none)
                return y;
            if (y.valid === none)
                return x;
            if (y.valid === false)
                return {valid: y.valid, value: x.value + y.value};
            let x_tags = x.valid !== unclear && x.valid !== true;
            let y_tags = y.valid !== unclear && y.valid !== true;
            if (x_tags && y_tags)
                return {valid: intersection(x.valid, y.valid), value: x.value + y.value};
            if (x_tags)
                return {valid: x.valid, value: x.value + y.value};
            if (y_tags)
                return {valid: y.valid, value: x.value + y.value};
            if (x.valid === unclear || y.valid === unclear)
                return {valid: unclear, value: x.value + y.value};
            return {valid: y.valid, value: x.value + y.value};
        };
    }

    function not(op) {
        return function(record) {
            let x = op(record); 
            if (x.valid === none || x.valid === unclear)
                return x;
            return {valid: !x.valid, value: x.value};
        };
    }
    
    function family(op) {
        return function(record) {
            let res = {valid: none, value: 0};
            for (let member of record.family) {
                let x = op(member);
                if (x.valid === none)
                    continue;
                if (x.valid && x.valid !== unclear)
                    return {valid: x.valid, value: res.value + x.value};
                if (res.valid !== unclear) {
                    res.valid = x.valid;
                    res.value += x.value;
                }
            }
            return res;
        };
    }
    
    let undefined_re = RegExp(`^(?:@[\\w -]+|\\d\\*|${l10n.filters["mythical"]}|${l10n.filters["legendary"]}|${l10n.filters["shiny"]}|${l10n.filters['genderunknown']}|${l10n.filters['female']}|${l10n.filters['male']}|${l10n.filters["costume"]}|${l10n.filters["eggsonly"]}|${l10n.filters["item"]}|${l10n.filters["megaevolve"]}|${l10n.filters["evolve"]}|${l10n.filters["tradeevolve"]}|${l10n.filters["evolvenew"]}|${l10n.filters['lucky']}|${l10n.filters['shadow']}|${l10n.filters['purified']}|${l10n.filters['defender']}|${l10n.filters['hp']}\\s*\\d*-?\\d*|${l10n.filters['cp']}\\s*\\d*-?\\d*|${l10n.filters['year']}\\s*\\d*-?\\d*|${l10n.filters['age']}\\s*\\d*-?\\d*|${l10n.filters['distance']}\\s*\\d*-?\\d*|${l10n.filters['buddy']}\\s*\\d*-?\\d*|${l10n.filters['traded']}|${l10n.filters['hatched']}|${l10n.filters['research']}|${l10n.filters['raid']}|${l10n.filters['remoteraid']}|${l10n.filters['exraid']}|${l10n.filters['megaraid']}|${l10n.filters['rocket']}|${l10n.filters['gbl']}|${l10n.filters['snapshot']}|${l10n.filters['candyxl']})$`, "i");
    let dex_re = /^(?:(\d+)|(\d*)-(\d*))$/;
    let evolve_re = RegExp(`^(?:${l10n.filters["evolve"]}|${l10n.filters["tradeevolve"]}|${l10n.filters["evolvenew"]})$`, "i");
    let megaevolve_re = RegExp(`^${l10n.filters["megaevolve"]}$`, "i");
    let item_re = RegExp(`^${l10n.filters["item"]}$`, "i");
    let eggsonly_re = RegExp(`^${l10n.filters["eggsonly"]}$`, "i");
    let costume_re = RegExp(`^${l10n.filters["costume"]}$`, "i");
    let male_re = RegExp(`^${l10n.filters['male']}$`, "i");
    let female_re = RegExp(`^${l10n.filters['female']}$`, "i");
    let genderunknown_re = RegExp(`^${l10n.filters['genderunknown']}$`, "i");
    let shiny_re = RegExp(`^${l10n.filters["shiny"]}$`, "i");
    let legendary_re = RegExp(`^${l10n.filters["legendary"]}$`, "i");
    let ultrabeasts_re = RegExp(`^${l10n.filters["ultrabeasts"]}$`, "i");
    let mythical_re = RegExp(`^${l10n.filters["mythical"]}$`, "i");
    
    function keyword(str) {
        if (str === "")
            return _record => declare(none, 0);
        let dex = str.match(dex_re);
        if (dex) {
            let left, right;
            if (dex[1])
                right = left = +dex[1];
            if (dex[2])
                left = +dex[2];
            if (dex[3])
                right = +dex[3];
            return record => declare((!left || left <= +record.data.dex) && (!right || +record.data.dex <= right), 0);
        }
        if (str.search(evolve_re) != -1)
            return record => declare(!!record.data.evolve, 1);
        if (str.search(megaevolve_re) != -1)
            return record => declare(!!record.data.megaevolve, 1);
        if (str.search(item_re) != -1)
            return record => declare(!!record.data.item, 1);
        if (str.search(eggsonly_re) != -1)
            return record => declare(!!record.data.eggsonly, 1);
        if (str.search(costume_re) != -1)
            return record => declare(!!record.kind.costume, 1);
        if (str.search(male_re) != -1)
            return record => declare(!!record.male, 1);
        if (str.search(female_re) != -1)
            return record => declare(!!record.female, 1);
        if (str.search(genderunknown_re) != -1)
            return record => declare(!record.male && !record.female, 1);
        if (str.search(shiny_re) != -1)
            return record => declare(!!record.kind.shiny, 1);
        if (str.search(legendary_re) != -1)
            return record => declare(!!record.data.legendary, 1);
        if (str.search(ultrabeasts_re) != -1)
            return record => declare(!!record.data.ultrabeast, 1);
        if (str.search(mythical_re) != -1)
            return record => declare(!!record.data.mythical, 1);
        if (str.search(undefined_re) != -1)
            return _record => declare(unclear, 1);
        return record => evaluate(l10n.names[record.data.name.toLowerCase()].toLowerCase().startsWith(str) ||
                                  l10n.filters[record.data.type1.toLowerCase()].toLowerCase() === str ||
                                  record.data.type2 !== "" && l10n.filters[record.data.type2.toLowerCase()].toLowerCase() === str ||
                                  l10n.filters[record.data.origin_region.toLowerCase()].toLowerCase() === str);
    }
    
    function checker(node) {
        switch (node.op) {
        case "and":
            return and(checker(node.arg[0]), checker(node.arg[1]));
        case "or":
            return or(checker(node.arg[0]), checker(node.arg[1]));
        case "not":
            return not(checker(node.arg));
        case "family":
            return family(checker(node.arg));
        case "keyword":
            return keyword(node.arg);
        case "section":
            return _record => ({valid: node.arg ? [node.arg] : [], value: 0});
        case "specy":
            return record => evaluate(l10n.names[record.data.name.toLowerCase()].toLowerCase() === node.arg);
        case "form":
            if (l10n.forms['male'].toLowerCase() === node.arg)
                return record => declare(!!record.male, 1);
            if (l10n.forms['female'].toLowerCase() === node.arg)
                return record => declare(!!record.female, 1);
            if (l10n.forms['shiny'].toLowerCase() === node.arg)
                return record => declare(!!record.kind.shiny, 1);
            return record => evaluate(record.data.form !== "" && l10n.forms[record.data.form.toLowerCase()].toLowerCase() === node.arg || 
                                      record.kind.title !== "" && l10n.forms[record.kind.title.toLowerCase()].toLowerCase() === node.arg ||
                                      record.data.origin !== "" && l10n.forms[record.data.origin.toLowerCase()].toLowerCase() === node.arg);
        }
    }
    if (!tree)
        return _record => declare(false, 0);
    return checker(tree);
}

function onfilter() {
    let l10n = l10n_by_id[storage.language].data;
    let checker = make_checker(parse_filter($('#filter').val()), l10n);
    for (let i = 0; i < data.length; ++i) {
        let mon = $('#' + data[i].pvpoke_id);
        let checked = false;
        for (let j = 0; j < data[i].genus.length; ++j) {
            if (!checker(data[i].genus[j]).valid)
                continue;
            checked = true;
        }
        if (checked)
            mon.show();
        else
            mon.hide();
    }
}

function on_list_change() {
    if ($('#list select option').length === 0)
        on_list_new("My first filter");
    load_list();
}   

function on_list_edit() {
    var old_name = $('#list select').val();
    var name = old_name;
    while (true) {
        name = prompt("Enter filter name", name);
        if (!name || name === old_name)
            return;
        if (!(name in storage.lists))
            break;
        alert(`The "${name}" filter already exists.`);
    }
    storage.lists[name] = storage.lists[old_name];
    delete storage.lists[old_name];
    $('#list select option:selected').prop('value', name).text(name)
    save_all();
    $('#settings_toolbox').hide();
}

function on_list_new(name) {
    if (!name) {
        while (true) {
            name = prompt("Enter filter name");
            if (!name)
                return;
            if (!(name in storage.lists))
                break;
            alert(`The "${name}" filter already exists.`);
        }
    }
    $('#list select').append($('<option></option>').prop('value', name).text(name));
    $('#list select option:last-child').prop('selected', true);
    storage.lists[name] = {
        species: {},
        _version_: 1,
        compact: false,
    };
    save_all();
    on_list_change();
    $('#settings_toolbox').hide();
}

function on_list_delete() {
    if (!confirm("Delete the filter?"))
        return;
    var name = $('#list select').val();
    $('#list select option:selected').remove();
    delete storage.lists[name];
    save_all();
    on_list_change();
    $('#settings_toolbox').hide();
}
        
function on_textarea_focus() {
    $('textarea').select();
}

function on_tag_new(data) {
    let tag_name = prompt('Enter tag name');
    if (!tag_name)
        return;
    if (tag_name in tags) {
        alert(`The "${tag_name}" tag already exists.`);
        return;
    }
    let elem = $(`<span class="tag" id="${$.escapeSelector(data.pvpoke_id+"_tag_"+tag_name)}">${tag_name}</span>`);
    $(`#${data.pvpoke_id}_toolbox .tags`).append(elem);
    elem.click(() => on_tag_click(data, tag_name));
    return on_tag_click(data, tag_name);
}

function on_tag_click(data, tag_name) {
    if (data.tags[tag_name] === data.genus.length) {
        for (let j = 0; j < data.genus.length; ++j) {
            remove_pokemon_tag(data.genus[j], tag_name);
        }
    } else {
        for (let j = 0; j < data.genus.length; ++j) {
            add_pokemon_tag(data.genus[j], tag_name);
        }
    }
    generate();
    save_all();
}

function add_pokemon_tag(poke, tag_name) {
    if (!(poke.id in species))
        species[poke.id] = default_specy();
    let {checked, tags: poke_tags} = species[poke.id];
    let index = lower_bound(poke_tags, tag_name);
    if (poke_tags[index] === tag_name)
        return;
    if (checked && poke_tags.length === 0)
        remove_from_section(poke, "");
    poke_tags.splice(index, 0, tag_name);
    if (checked)
        add_to_section(poke, tag_name);
    if (!(tag_name in tags))
        tags[tag_name] = 0;
    tags[tag_name] += 1;
    if (!(tag_name in poke.data.tags))
        poke.data.tags[tag_name] = 0;
    poke.data.tags[tag_name] += 1;
    let container = $(`#${$.escapeSelector(poke.data.pvpoke_id+"_tag_"+tag_name)}`);
    container.addClass('partial');
    if (poke.data.tags[tag_name] === poke.data.genus.length)
        container.addClass('full');
    update(poke.data);
}

function remove_pokemon_tag(poke, tag_name) {
    if (!(poke.id in species))
        species[poke.id] = default_specy();
    let {checked, tags: poke_tags} = species[poke.id];
    let index = lower_bound(poke_tags, tag_name);
    if (poke_tags[index] !== tag_name)
        return;
    if (checked)
        remove_from_section(poke, tag_name);
    poke_tags.splice(index, 1);
    if (checked && poke_tags.length === 0)
        add_to_section(poke, "");
    tags[tag_name] -= 1;
    if (tags[tag_name] === 0)
        delete tags[tag_name];
    poke.data.tags[tag_name] -= 1;
    if (poke.data.tags[tag_name] === 0)
        delete poke.data.tags[tag_name];
    let container = $(`#${$.escapeSelector(poke.data.pvpoke_id+"_tag_"+tag_name)}`);
    container.removeClass('full');
    if (!poke.data.tags[tag_name])
        container.removeClass('partial');
    update(poke.data);
}

function on_pokemon_context(e, i) {
    e.preventDefault();

    if (!data[i].toolbox_ready) {
        let genus = data[i].genus;
        for (let j = 0; j < genus.length; ++j) {
            $(`#${genus[j].id}`).prepend(`<img src="${fandom_image(genus[j].kind.fandom_id, 48)}"/>`);
        }
        data[i].toolbox_ready = true;
    }

    let tags_container = $(`#${data[i].pvpoke_id}_toolbox .tags`)
    tags_container.find('> .tag').remove();

    let elem = $(`<span class="tag">+</span>`);
    elem.click(() => on_tag_new(data[i]));
    tags_container.append(elem);

    let n_items = data[i].genus.length;
    for (let tag_name of Object.keys(tags).sort((key1, key2) => +data[i].tags[key2] - +data[i].tags[key1] || (key1 > key2)-(key1 < key2))) {
        let elem = $(`<span class="tag ${!data[i].tags[tag_name] ? "" : data[i].tags[tag_name] === n_items ? "full" : "partial"}" id="${$.escapeSelector(data[i].pvpoke_id+"_tag_"+tag_name)}">${tag_name}</span>`);
        elem.click(() => on_tag_click(data[i], tag_name));
        tags_container.append(elem);
    }

    $(`#${data[i].pvpoke_id}_toolbox`).show();
}

function on_toolbox_close(_e, i) {
    $(`#${data[i].pvpoke_id}_toolbox`).hide();
    generate();
    save_all();
}

function reset() {
    if (!confirm("Clear all data?"))
        return;
    localStorage.removeItem(location.pathname);
    document.location.reload();
}

function parse(e) {
    if (!confirm("Parse filter?"))
        return;
    var text = e.originalEvent.clipboardData.getData('text');
    e.preventDefault();
    let tree = parse_filter(text);
    if (!tree) {
        alert('Failed to parse');
        return;
    }

    let best_species;
    let best_value = -1;
    for (let i = 0; i < l10n.length; ++i) {
        let checker = make_checker(tree, l10n[i].data);
        
        let species = {};
        let value = 0;
        for (let id in pokemon) {
            let r = checker(pokemon[id]);
            value += r.value;
            if (!r.valid)
                continue;
            let tags = [];
            if (r.valid.length)
                tags = r.valid;
            species[id] = {tags: tags, checked: true};
        }

        // console.log(`${l10n[i].name} gaines ${value} points.`);
        if (best_value < value) {
            best_species = species;
            best_value = value;
        }
    }
    
    list.species = best_species;
    save_all();
    load_list();
}

function on_language_change() {
    storage.language = $('#language').val();
    // for (let i = 0; i < data.length; ++i)
        // update(i);
    onfilter();
    generate();
    save_all();
}

function on_menu_click() {
    $('#settings_toolbox').show();
}

function bind_triggers() {
    for (let i = 0; i < data.length; ++i) {
        if (data[i].kinds.length == 0)
            continue;
        let genus = data[i].genus;
        for (let j = 0; j < genus.length; ++j) {
            let container = $(`#${genus[j].id}`);
            container.click(() => on_pokemon_genus_click(genus[j].id));
        }
        $(`#${data[i].pvpoke_id}_toolbox`).bind('click', e => on_toolbox_close(e, i));
        $(`#${data[i].pvpoke_id}_toolbox > div > div`).bind('click', e => e.stopPropagation());
        $(`#${data[i].pvpoke_id}_toolbox div.back`).bind('click', e => on_toolbox_close(e, i));
        // $(`#${data[i].pvpoke_id} > input`).change(() => onchange(i));
        // $(`#${data[i].pvpoke_id}`).bind('contextmenu', e => on_pokemon_context(e, i));
        let container = $(`#${data[i].pvpoke_id}`);
        container.click(() => on_pokemon_click(i));
        container.bind('contextmenu', e => on_pokemon_context(e, i));
    }

    $('#selection_mode').bind('change', on_selection_mode_change);
    $('#compact').bind('change', on_compact_change);
    $('#filter').bind('input', onfilter);
    $('#list select').bind('change', on_list_change);
    $('#edit_list_button').click(on_list_edit);
    $('#new_list_button').click(() => on_list_new());
    $('#delete_list_button').click(on_list_delete);
    $('#language').bind('change', on_language_change);
    $('textarea').bind('focus', on_textarea_focus);
    $('textarea').bind('paste', parse);
    $('textarea').bind('input', generate);
    $('#menu').click(on_menu_click);
    $(`#settings_toolbox`).bind('click', () => $('#settings_toolbox').hide());
    $(`#settings_toolbox > div > div`).bind('click', e => e.stopPropagation());
    $(`#settings_toolbox div.back`).bind('click', () => $('#settings_toolbox').hide());
}

function process_l10n_data(_l10n) {
    l10n = _l10n;
    l10n_by_id = {};
    for (let i = 0; i < l10n.length; ++i) {
        $('#language').append(`<option value="${l10n[i].id}">${l10n[i].name}</option>`);
        l10n_by_id[l10n[i].id] = l10n[i];
        request_json("l10n/" + l10n[i].filename, function(data) {
            l10n[i].data = {};
            for (let section in data) {
                let translations = {};
                // let originals = {};
                l10n[i].data[section.toLowerCase()] = translations;
                // l10n[i].data['original_' + section.toLowerCase()] = originals;
                for (let key in data[section]) {
                    translations[key.toLowerCase()] = data[section][key];
                    // originals[data[section][key].toLowerCase()] = key;
                }
            }
        });
    }
}

function prepare_data() {
    pokemon = {};
    var family = {};
    for (let i = 0; i < data.length; ++i) {
        data[i].genus = [];
        data[i].shiny = false;
        data[i].costume = false;
        data[i].male = false;
        data[i].female = false;
        data[i].genderunknown = false;
        data[i].tags = {};

        if (family[data[i].family] === undefined)
            family[data[i].family] = [];
        family[data[i].family].push(data[i]);
        data[i].family = family[data[i].family];

        for (let j = 0; j < data[i].kinds.length; ++j) {
            for (let [male, female, gender] of [[true, false, "male"], [false, true, "female"], [false, false, "genderunknown"]]) {
                if (male && data[i].kinds[j].male || female && data[i].kinds[j].female || !male && !data[i].kinds[j].male && !female && !data[i].kinds[j].female) {
                    let id = data[i].pvpoke_id + '_';
                    if (data[i].kinds[j].suffix)
                        id += data[i].kinds[j].suffix + '_';
                    if (male)
                        id += 'm';
                    if (female)
                        id += 'f';
                    if (!male && !female)
                        id += 'u';
                    if (data[i].kinds[j].shiny)
                        id += 's';
                    id = $.escapeSelector(id);
                    if (id in pokemon)
                        console.error(`Dublicate pokemon id "${id}"`);
                    pokemon[id] = {
                        id: id,
                        data: data[i],
                        kind: data[i].kinds[j],
                        male: male,
                        female: female,
                        genus: data[i].genus,
                        gender: gender
                    };
                    data[i].genus.push(pokemon[id]);
                    data[i].shiny = data[i].shiny || data[i].kinds[j].shiny;
                    data[i].costume = data[i].costume || data[i].kinds[j].costume;
                    data[i].male = data[i].male || male;
                    data[i].female = data[i].female || female;
                    data[i].genderunknown = data[i].genderunknown || !(male || female);
                }
            }
        }
        for (let j = 1; j < data[i].genus.length; ++j) {
            if (data[i].genus[j-1].kind.title != data[i].genus[j].kind.title ||
                data[i].genus[j-1].kind.shiny != data[i].genus[j].kind.shiny)
                continue;
            data[i].genus[j-1].pair = data[i].genus[j];
            data[i].genus[j].pair = data[i].genus[j-1];
        }
    }
}

function prepare_content() {
    var content = $('div.content');
    for (let i = 0; i < data.length; ++i) {
        if (data[i].kinds.length == 0)
            continue;
        if (i === 0 || data[i].region !== data[i-1].region)
            content.append('<div class="region"><span>' + data[i].region + '</span><hr/></div>');
        let title = `${data[i].dex}. ${data[i].name}${(data[i].origin ? ' (' + data[i].origin + ')' : '')}${(data[i].form ? ' (' + data[i].form + ')' : '')}`;
        content.append(`<span class="pokemon" title="${title}" id="${data[i].pvpoke_id}" style="display: none;"><s></s><i></i><u></u><img src="${image(i)}"></span>`);
        let kinds_html = `<div id="${data[i].pvpoke_id}_toolbox" class="toolbox" style="display: none;"><div><div><div class="head"><div class="back"></div><div class="icon"><img class="icon" src="${image(i)}"></div><div class="title">${title}</div></div><div class="tags"></div><div class="body">`;

        kinds_html += '<div class="section"><div class="section">';
        let genus = data[i].genus;
        for (let j = 0; j < genus.length; ++j) {
            if (j > 0) {
                if (genus[j-1].kind.title != genus[j].kind.title)
                    kinds_html += '</div></div><div class="section"><div class="section">';
                else if (genus[j-1].kind.shiny != genus[j].kind.shiny)
                    kinds_html += '</div><div class="section">';
            }
            let title_genus = `${genus[j].kind.title ? ' (' + genus[j].kind.title + ')' : ''}${genus[j].male ? ' ♂' : ''}${genus[j].female ? ' ♀' : ''}${(genus[j].kind.shiny ? ' ✨' : '')}`;
            kinds_html += `<span class="pokemon${genus[j].male ? " male" : ""}${genus[j].female ? " female" : ""}${genus[j].kind.shiny ? " shiny" : ""}" title="${title}\n${title_genus}" id="${genus[j].id}"><s></s><i></i><u></u></span>`;
        }
        kinds_html += '</div></div>';

        kinds_html += '</div></div></div></div>';
        content.append(kinds_html);
    }
}

function check_l10n() {
    for (let k = 0; k < l10n.length; ++k) {
        for (let i = 0; i < data.length; ++i) {
            if (data[i].name && !(data[i].name.toLowerCase() in l10n[k].data.names)) {
                console.warn(`"${data[i].name}" is missing from "${l10n[k].name}"`);
                l10n[k].data.names[data[i].name.toLowerCase()] = data[i].name;
            }
            if (data[i].origin && !(data[i].origin.toLowerCase() in l10n[k].data.forms)) {
                console.warn(`"${data[i].origin}" is missing from "${l10n[k].name}"`);
                l10n[k].data.forms[data[i].origin.toLowerCase()] = data[i].origin;
            }
            if (data[i].form && !(data[i].form.toLowerCase() in l10n[k].data.forms)) {
                console.warn(`"${data[i].form}" is missing from "${l10n[k].name}"`);
                l10n[k].data.forms[data[i].form.toLowerCase()] = data[i].form;
            }
            for (let j = 0; j < data[i].genus.length; ++j) {
                if (data[i].genus[j].kind.title && !(data[i].genus[j].kind.title.toLowerCase() in l10n[k].data.forms)) {
                    console.warn(`"${data[i].genus[j].kind.title}" is missing from "${l10n[k].name}"!`);
                    l10n[k].data.forms[data[i].genus[j].kind.title.toLowerCase()] = data[i].genus[j].kind.title; 
                }
            }
        }
    }
}

function process_data(_data) {
    data = _data;
    prepare_data();
    prepare_content();
    prepare_structures();
}

function load_all() {
    storage = JSON.parse(localStorage.getItem(location.pathname) || "{}");
    if (!storage.lists)
        storage.lists = {};
    if (!storage.language)
        storage.language = l10n[0].id;
    for (let name in storage.lists) {
        $('#list select').append($('<option></option>').prop('value', name).text(name));
    }
    $('#list select option:first-child').prop('selected', true);
    $(`#language option[value=${storage.language}]`).prop('selected', true);

    check_l10n();
    on_list_change();
    bind_triggers();
}

var n_requests = 0;
function request_json(filename, callback) {
    ++n_requests;
    $.getJSON(filename, function(data) {
        callback(data);
        // console.log(`Loaded "${filename}"`);
        --n_requests;
        if (n_requests === 0)
            load_all();
    }).fail(function() {
        console.log(`Failed to parse JSON data from "${filename}"`);
        alert(`Failed to parse JSON data from "${filename}"`);
    });
}

$(document).ready(function() {
    request_json("l10n/list.json", process_l10n_data);
    request_json("pogo_data.json", process_data);
})

document.documentElement.style.setProperty('--toolbox-max-height', `${window.innerHeight}px`);
window.addEventListener('resize', () => {
  document.documentElement.style.setProperty('--toolbox-max-height', `${window.innerHeight}px`);
});
