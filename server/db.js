const { Pool } = require('pg')
let pool=null;
const ERR_NOPOOL="Error: db connections pool not created! (use db.init(cred)) !";
//const pool = new Pool()
/* a query can be an object with {text: , values: and rowMode: } properties 
   rowMode can be set to 'array' in order to return rows as arrays instead of objects
   const query = {
      text: 'SELECT $1::text as first_name, select $2::text as last_name',
      values: ['Brian', 'Carlson'],
       rowMode: 'array',
   }
   Rows are returned in res.rows (as array of arrays), to get the columns: 
      res.fields.map(field => field.name)
*/
function errpool() {
    if (!pool) {
        console.log(ERR_NOPOOL);
        return true;
    }
    return false;
}

const qry_rna_dsets=`with dsbr as (select distinct dataset_id as ds_id, p.id as p_id
  FROM exp_rnaseq e, samples s, subjects p
  WHERE e.dropped is not true and e.s_id=s.id and s.subj_id = p.id ),
dxc as (select ds_id, dx_id, count(*) as bc from dsbr, subjects p
     where p_id=p.id group by 1,2 order by 1 ),
 dxsum as (select ds_id, array_agg(dx || ':' || bc::text order by dx.id) as dxs,
   sum(bc) as brcount from dxc, dx where dx_id=dx.id group by 1 ),
ac as (select ds_id, case when age<=0 then 0 when age<=15 then 1  else 2 end as agebin,
     count(*) as bc from dsbr, subjects p where p_id=p.id group by 1,2 order by 1 ),
 asum as (select ds_id, array_agg(case agebin when 0 then 'fetal' when 1 then 'child' else 'adult' end
      || ':' || bc::text order by agebin) as agebins from ac group by 1 order by 1 ),
racec as (select ds_id, race, count(*) as bc from dsbr, subjects p
     where p_id=p.id group by 1,2 order by 1 ),
 racesum as (select ds_id, array_agg(race || ':' || bc::text order by race) as ancestry
   from racec group by 1 )
select d.id, d.name, dxs, ancestry, agebins, brcount
 from dxsum dx, asum a, racesum r, datasets d where d.id=dx.ds_id
   and r.ds_id=d.id and a.ds_id=dx.ds_id`


module.exports = {
    init:  (credentials) => { pool= new Pool(credentials); },
    query: (text, params, callback) => {
      const qrycfg={ text, values: params, rowMode: 'array' };
      if (errpool()) {
          return callback(ERR_NOPOOL, null);
      }
      const start = Date.now()
      return pool.query(qrycfg, (err, res) => {
        const duration = Date.now() - start;
        if (err) {
            console.log('query-error:', { query:text, error:err.message} );
        } else {
          console.log('query', { query:text, duration, rows: res.rowCount })
        }
        //callback(err, res) //caller should use res.rows
        // arrayMode: pass to callback res as [ columns, res.rows] :
        const hrows=[ res.fields.map(field => field.name) ]
        Array.prototype.push.apply(hrows, res.rows);
        callback(err, hrows)
      })
    },
    //async/await version
    async queryAsync(text, params) {
        const qrycfg={ text, values: params, rowMode: 'array' }
        const start = Date.now()
        const res = await pool.query(qrycfg)
        const duration = Date.now() - start
        console.log('executed query', { text, duration, rows: res.rowCount })
        return res
      },
    
    //if we need to check out a client from the pool to run 
    // several queries in a row in a transaction
    //-- prevent routes checking out a client from forgetting 
    //   to call done (leaking client), so add more info here
    getClient: (callback) => {
        pool.connect((err, client, done) => {
            const query = client.query //save original query here
            // monkey patch the query method to keep track of the last query executed
            client.query = (...args) => {
                client.lastQuery = args        
                return query.apply(client, args)
            }
            // set a timeout of 5 seconds, after which we will log this client's last query
            const timeout = setTimeout(() => {
                console.error('A client has been checked out for more than 5 seconds!')
                console.error(`The last executed query on this client was: ${client.lastQuery}`)
            }, 5000)
            const release = (err) => {
                // call the actual 'done' method, returning this client to the pool
                done(err)
                // clear our timeout
                clearTimeout(timeout)
                // set the query method back to its old un-monkey-patched version
                client.query = query
            }
            callback(err, client, release)
        })
      },
      //async/await version
      async getClientAsync() {
        const client = await pool.connect()
        const query = client.query
        const release = client.release
        // set a timeout of 5 seconds, after which we will log this client's last query
        const timeout = setTimeout(() => {
          console.error('A client has been checked out for more than 5 seconds!')
          console.error(`The last executed query on this client was: ${client.lastQuery}`)
        }, 5000)
        // monkey patch the query method to keep track of the last query executed
        client.query = (...args) => {
          client.lastQuery = args
          return query.apply(client, args)
        }
        client.release = () => {
          // clear our timeout
          clearTimeout(timeout)
          // set the methods back to their old un-monkey-patched version
          client.query = query
          client.release = release
          return release.apply(client)
        }
        return client
      }
  }