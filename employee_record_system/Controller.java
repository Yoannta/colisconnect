/**
 * Name: TODO
 * Student Number: TODO
 *
 * Console controller used to test the base classes.
 */
public class Controller
{
    /**
     * Runs the console test.
     *
     * @param a command-line arguments
     */
    public static void main(String a[])
    {
        Store store;
        store = new Store(100);
        System.out.println("Current size of store is " + Store.getCount());

        if (!Store.isFull())
        {
            store.add(new Employee());
        }
        else
        {
            System.out.println("Store full");
        }

        if (!Store.isFull())
        {
            store.add(new Employee("John", 'M', new Date(31, 10, 2006), "1", new Date(1, 1, 2006)));
        }
        else
        {
            System.out.println("Store full");
        }

        if (!Store.isFull())
        {
            store.add(new Employee("Jane", 'F', new Date(31, 11, 1986), "2", new Date(1, 2, 2007)));
        }
        else
        {
            System.out.println("Store full");
        }

        store.displayAll();
        System.out.println("Current size of store is " + Store.getCount());
    }
}
